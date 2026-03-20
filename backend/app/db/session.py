from collections.abc import AsyncGenerator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _build_engine() -> object:
    url = make_url(settings.database_url)
    query = dict(url.query)
    connect_args: dict[str, object] = {}

    # Supabase examples often use sslmode=require. asyncpg expects "ssl".
    sslmode = query.pop("sslmode", None)
    if sslmode:
        connect_args["ssl"] = sslmode

    host = url.host or ""
    # Supabase pooler (PgBouncer transaction mode) breaks prepared statements.
    if "pooler.supabase.com" in host:
        connect_args["statement_cache_size"] = 0
        query["prepared_statement_cache_size"] = "0"

    sanitized_url = url.set(query=query).render_as_string(hide_password=False)

    return create_async_engine(
        sanitized_url,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=20,
        connect_args=connect_args,
    )


engine = _build_engine()

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
