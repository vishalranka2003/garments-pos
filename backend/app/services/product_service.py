import uuid

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product, ProductVariant
from app.models.store import Store
from app.schemas.product import ProductCreate, ProductUpdate


def _owned_store_query(store_id: uuid.UUID, clerk_user_id: str) -> Select[tuple[Store]]:
    return select(Store).where(Store.id == store_id, Store.owner_id == clerk_user_id)


async def create_product(db: AsyncSession, payload: ProductCreate, clerk_user_id: str) -> Product:
    store = await db.scalar(_owned_store_query(payload.store_id, clerk_user_id))
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    product = Product(store_id=payload.store_id, name=payload.name, category=payload.category)
    for variant in payload.variants:
        product.variants.append(
            ProductVariant(
                size=variant.size,
                color=variant.color,
                sku=variant.sku,
                price=variant.price,
                stock_quantity=variant.stock_quantity,
            )
        )

    db.add(product)
    await db.commit()
    await db.refresh(product, attribute_names=["variants"])
    return product


async def list_products(db: AsyncSession, store_id: uuid.UUID, clerk_user_id: str) -> list[Product]:
    store = await db.scalar(_owned_store_query(store_id, clerk_user_id))
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    stmt = (
        select(Product)
        .options(selectinload(Product.variants))
        .where(Product.store_id == store_id)
        .order_by(Product.created_at.desc())
    )
    products = await db.scalars(stmt)
    return list(products.all())


async def get_product(db: AsyncSession, product_id: uuid.UUID, store_id: uuid.UUID, clerk_user_id: str) -> Product:
    store = await db.scalar(_owned_store_query(store_id, clerk_user_id))
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    stmt = (
        select(Product)
        .options(selectinload(Product.variants))
        .where(Product.id == product_id, Product.store_id == store_id)
    )
    product = await db.scalar(stmt)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def update_product(
    db: AsyncSession,
    product_id: uuid.UUID,
    store_id: uuid.UUID,
    payload: ProductUpdate,
    clerk_user_id: str,
) -> Product:
    product = await get_product(db, product_id=product_id, store_id=store_id, clerk_user_id=clerk_user_id)
    if payload.name is not None:
        product.name = payload.name
    if payload.category is not None:
        product.category = payload.category

    if payload.variants is not None:
        await db.execute(delete(ProductVariant).where(ProductVariant.product_id == product.id))
        for variant in payload.variants:
            if (
                variant.size is None
                or variant.color is None
                or variant.sku is None
                or variant.price is None
                or variant.stock_quantity is None
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="All variant fields are required when replacing variants",
                )
            product.variants.append(
                ProductVariant(
                    product_id=product.id,
                    size=variant.size,
                    color=variant.color,
                    sku=variant.sku,
                    price=variant.price,
                    stock_quantity=variant.stock_quantity,
                )
            )

    await db.commit()
    await db.refresh(product, attribute_names=["variants"])
    return product


async def delete_product(db: AsyncSession, product_id: uuid.UUID, store_id: uuid.UUID, clerk_user_id: str) -> None:
    product = await get_product(db, product_id=product_id, store_id=store_id, clerk_user_id=clerk_user_id)
    await db.delete(product)
    await db.commit()
