import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


def _log_bearer_debug(raw: str) -> None:
    """Dev-only: never log full JWT in production (secrets / compliance)."""
    if not settings.app_debug:
        return
    n = len(raw)
    if n <= 24:
        preview = f"{raw[:8]}…"
    else:
        preview = f"{raw[:16]}…{raw[-12:]} ({n} chars)"
    logger.info("Authorization Bearer (truncated): %s", preview)


@dataclass
class AuthUser:
    clerk_user_id: str


async def _ensure_user_row(clerk_user_id: str) -> None:
    """
    Insert into users on first seen Clerk id.
    Uses its own session + commit so rows persist on read-only routes (GET) that never commit.
    """
    async with SessionLocal() as db:
        existing = await db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
        if existing is not None:
            return
        db.add(User(clerk_user_id=clerk_user_id))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            return
        if settings.app_debug:
            logger.info("Registered new users row for clerk_user_id=%s", clerk_user_id)


def _jwks_fetch_error_detail(url: str, status_code: int, body: str) -> str:
    hint = ""
    if ".accounts.dev" in url and ".clerk.accounts.dev" not in url:
        hint = (
            " Dev instances must use the Frontend API host with `.clerk` in the name, e.g. "
            "`https://YOUR_INSTANCE.clerk.accounts.dev/.well-known/jwks.json` "
            "(copy from Clerk Dashboard → Configure → API keys → “Frontend API URL”)."
        )
    return (
        f"Could not load Clerk JWKS (HTTP {status_code}). "
        f"Check CLERK_JWKS_URL in .env matches your Clerk project.{hint} "
        f"URL tried: {url}"
    )


@lru_cache(maxsize=1)
def _jwks_cache() -> dict[str, Any]:
    if not settings.clerk_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk JWKS URL is not configured (set CLERK_JWKS_URL).",
        )
    url = settings.clerk_jwks_url.strip()
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        body = (exc.response.text or "")[:200]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_jwks_fetch_error_detail(url, exc.response.status_code, body),
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not reach Clerk JWKS URL: {url} ({exc!s})",
        ) from exc


def _get_signing_key(token: str) -> dict[str, Any]:
    token = token.strip()
    if token.startswith("pk_test_") or token.startswith("pk_live_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sent a Clerk publishable key (pk_…) as the bearer token — use a session JWT from Clerk, or enable AUTH_BYPASS for local dev.",
        )
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed JWT — token must be a Clerk session JWT (three dot-separated segments), not a random string or API key.",
        ) from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token key id missing")

    keys = _jwks_cache().get("keys", [])
    for key in keys:
        if key.get("kid") == kid:
            return key
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signing key not found")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthUser:
    if settings.auth_bypass and settings.app_env in {"development", "local"}:
        clerk_id = settings.auth_bypass_user_id
        await _ensure_user_row(clerk_id)
        request.state.clerk_user_id = clerk_id
        return AuthUser(clerk_user_id=clerk_id)

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    _log_bearer_debug(token)
    key = _get_signing_key(token)
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer or None,
            audience=settings.clerk_audience or None,
            options={"verify_aud": bool(settings.clerk_audience)},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    await _ensure_user_row(subject)
    request.state.clerk_user_id = subject
    return AuthUser(clerk_user_id=subject)
