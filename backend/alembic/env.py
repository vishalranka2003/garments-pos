from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection, make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.models import order, product, store, user  # noqa: F401

config = context.config


def _alembic_database_url() -> str:
    url = make_url(settings.database_url)
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    if sslmode:
        query["ssl"] = sslmode
    host = url.host or ""
    if "pooler.supabase.com" in host:
        query["prepared_statement_cache_size"] = "0"
    normalized = url.set(query=query).render_as_string(hide_password=False)
    # ConfigParser treats % as interpolation; escape URL-encoded passwords.
    return normalized.replace("%", "%%")


config.set_main_option("sqlalchemy.url", _alembic_database_url())

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url = make_url(settings.database_url)
    query = dict(url.query)
    connect_args: dict[str, object] = {}

    sslmode = query.pop("sslmode", None)
    if sslmode:
        connect_args["ssl"] = sslmode

    host = url.host or ""
    if "pooler.supabase.com" in host:
        connect_args["statement_cache_size"] = 0
        query["prepared_statement_cache_size"] = "0"

    normalized_url = url.set(query=query).render_as_string(hide_password=False)

    connectable = create_async_engine(
        normalized_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_migrations_online())
