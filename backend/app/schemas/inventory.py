import uuid

from pydantic import BaseModel, ConfigDict, Field


class InventoryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    variant_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    sku: str
    size: str
    color: str
    stock_quantity: int
    price: float


class InventoryUpdate(BaseModel):
    stock_quantity: int = Field(ge=0)
