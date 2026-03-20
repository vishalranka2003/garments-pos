import uuid
from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductVariant
from app.models.store import Store
from app.schemas.order import OrderCreate


async def create_order(db: AsyncSession, payload: OrderCreate, clerk_user_id: str) -> Order:
    merged_items: dict[uuid.UUID, int] = defaultdict(int)
    for item in payload.items:
        merged_items[item.product_variant_id] += item.quantity

    variant_ids = list(merged_items.keys())
    if not variant_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order requires items")

    async with db.begin():
        store = await db.scalar(
            select(Store).where(Store.id == payload.store_id, Store.owner_id == clerk_user_id)
        )
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

        variants_stmt = (
            select(ProductVariant)
            .join(Product, Product.id == ProductVariant.product_id)
            .where(ProductVariant.id.in_(variant_ids), Product.store_id == payload.store_id)
            .with_for_update()
        )
        variants = list((await db.scalars(variants_stmt)).all())
        variant_map = {variant.id: variant for variant in variants}

        if len(variant_map) != len(variant_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Some variants not found")

        order_total = Decimal("0")
        order_items: list[OrderItem] = []

        for variant_id, quantity in merged_items.items():
            variant = variant_map[variant_id]
            if not settings.allow_negative_stock and variant.stock_quantity < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for SKU {variant.sku}",
                )

            line_price = Decimal(variant.price)
            order_total += line_price * quantity
            variant.stock_quantity -= quantity
            if not settings.allow_negative_stock and variant.stock_quantity < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock cannot be negative for SKU {variant.sku}",
                )

            order_items.append(
                OrderItem(
                    product_variant_id=variant.id,
                    quantity=quantity,
                    price=line_price,
                )
            )

        discount = payload.discount or Decimal("0")
        final_amount = order_total - discount
        if final_amount < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discount cannot exceed total amount",
            )

        order = Order(
            store_id=payload.store_id,
            total_amount=order_total,
            discount=discount,
            final_amount=final_amount,
            payment_method=payload.payment_method,
            items=order_items,
        )
        db.add(order)

    await db.refresh(order, attribute_names=["items"])
    return order
