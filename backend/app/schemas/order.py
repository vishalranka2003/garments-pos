import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.order import PaymentMethod


class OrderItemCreate(BaseModel):
    product_variant_id: uuid.UUID
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    store_id: uuid.UUID
    items: list[OrderItemCreate] = Field(min_length=1)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    payment_method: PaymentMethod

    @model_validator(mode="after")
    def validate_discount(self) -> "OrderCreate":
        if self.discount < 0:
            raise ValueError("discount cannot be negative")
        return self


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_variant_id: uuid.UUID
    quantity: int
    price: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    total_amount: Decimal
    discount: Decimal
    final_amount: Decimal
    payment_method: PaymentMethod
    created_at: datetime
    items: list[OrderItemOut]
