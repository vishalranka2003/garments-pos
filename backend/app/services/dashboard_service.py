import uuid
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem
from app.models.product import Product, ProductVariant
from app.models.store import Store
from app.schemas.dashboard import DashboardSummaryOut, TopSellingProduct


async def get_dashboard_summary(
    db: AsyncSession, store_id: uuid.UUID, clerk_user_id: str
) -> DashboardSummaryOut:
    store = await db.scalar(
        select(Store).where(Store.id == store_id, Store.owner_id == clerk_user_id)
    )
    if not store:
        return DashboardSummaryOut(
            today_sales=0,
            total_orders_today=0,
            top_selling_products=[],
        )

    now = datetime.now(timezone.utc)
    start_of_day = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    start_of_next_day = start_of_day + timedelta(days=1)

    sales_stmt = select(
        func.coalesce(func.sum(Order.final_amount), 0),
        func.count(Order.id),
    ).where(
        Order.store_id == store_id,
        Order.created_at >= start_of_day,
        Order.created_at < start_of_next_day,
    )
    sales_result = (await db.execute(sales_stmt)).one()

    top_products_stmt = (
        select(
            Product.id,
            Product.name,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("qty_sold"),
        )
        .select_from(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .join(ProductVariant, ProductVariant.id == OrderItem.product_variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(
            Order.store_id == store_id,
            Order.created_at >= start_of_day,
            Order.created_at < start_of_next_day,
        )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    top_rows = (await db.execute(top_products_stmt)).all()

    return DashboardSummaryOut(
        today_sales=float(sales_result[0]),
        total_orders_today=int(sales_result[1]),
        top_selling_products=[
            TopSellingProduct(
                product_id=row[0],
                product_name=row[1],
                total_quantity_sold=int(row[2]),
            )
            for row in top_rows
        ],
    )
