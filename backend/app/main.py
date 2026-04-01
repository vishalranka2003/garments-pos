import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api import dashboard, inventory, orders, products, stores
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import order, product, store, user  # noqa: F401


def _configure_app_logging() -> None:
    """
    Uvicorn often leaves the root logger at WARNING, so app logger.info() is dropped.
    Attach a handler to `app` so route logs (e.g. stores) always show on stderr.
    """
    level = logging.DEBUG if settings.app_debug else logging.INFO
    app_log = logging.getLogger("app")
    app_log.setLevel(level)
    if app_log.handlers:
        return
    handler = logging.StreamHandler()
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    app_log.addHandler(handler)
    app_log.propagate = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_app_logging()
    if settings.auto_create_tables:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stores.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
