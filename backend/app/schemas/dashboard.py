import uuid

from pydantic import BaseModel


class TopSellingProduct(BaseModel):
    product_id: uuid.UUID
    product_name: str
    total_quantity_sold: int


class DashboardSummaryOut(BaseModel):
    today_sales: float
    total_orders_today: int
    top_selling_products: list[TopSellingProduct]
