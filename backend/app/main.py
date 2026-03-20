from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import dashboard, inventory, orders, products, stores
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import order, product, store, user  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_create_tables:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.include_router(stores.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
