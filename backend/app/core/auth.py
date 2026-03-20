from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=True)


@dataclass
class AuthUser:
    clerk_user_id: str


@lru_cache(maxsize=1)
def _jwks_cache() -> dict[str, Any]:
    if not settings.clerk_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk JWKS URL is not configured",
        )
    with httpx.Client(timeout=5.0) as client:
        response = client.get(settings.clerk_jwks_url)
        response.raise_for_status()
        return response.json()


def _get_signing_key(token: str) -> dict[str, Any]:
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header") from exc

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
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    token = credentials.credentials
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

    user = AuthUser(clerk_user_id=subject)
    request.state.clerk_user_id = subject
    return user
