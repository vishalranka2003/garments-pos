import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, ProductVariant
from app.models.store import Store
from app.schemas.inventory import InventoryItemOut


async def list_inventory(db: AsyncSession, store_id: uuid.UUID, clerk_user_id: str) -> list[InventoryItemOut]:
    owned_store = await db.scalar(
        select(Store).where(Store.id == store_id, Store.owner_id == clerk_user_id)
    )
    if not owned_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    stmt = (
        select(ProductVariant, Product)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(Product.store_id == store_id)
        .order_by(Product.name.asc(), ProductVariant.color.asc(), ProductVariant.size.asc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        InventoryItemOut(
            variant_id=variant.id,
            product_id=product.id,
            product_name=product.name,
            sku=variant.sku,
            size=variant.size,
            color=variant.color,
            stock_quantity=variant.stock_quantity,
            price=float(variant.price),
        )
        for variant, product in rows
    ]


async def update_stock(
    db: AsyncSession,
    variant_id: uuid.UUID,
    store_id: uuid.UUID,
    stock_quantity: int,
    clerk_user_id: str,
) -> tuple[ProductVariant, Product]:
    stmt = (
        select(ProductVariant, Product)
        .join(Product, Product.id == ProductVariant.product_id)
        .join(Store, Store.id == Product.store_id)
        .where(
            ProductVariant.id == variant_id,
            Product.store_id == store_id,
            Store.owner_id == clerk_user_id,
        )
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    variant, product = row

    variant.stock_quantity = stock_quantity
    await db.commit()
    await db.refresh(variant)
    return variant, product
