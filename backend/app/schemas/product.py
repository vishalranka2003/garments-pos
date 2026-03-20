import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductVariantCreate(BaseModel):
    size: str = Field(min_length=1, max_length=50)
    color: str = Field(min_length=1, max_length=50)
    sku: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(ge=0)
    stock_quantity: int = Field(ge=0)


class ProductVariantUpdate(BaseModel):
    size: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, min_length=1, max_length=50)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(default=None, ge=0)
    stock_quantity: int | None = Field(default=None)


class ProductCreate(BaseModel):
    store_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    variants: list[ProductVariantCreate] = Field(min_length=1)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    variants: list[ProductVariantUpdate] | None = None


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    size: str
    color: str
    sku: str
    price: Decimal
    stock_quantity: int


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    name: str
    category: str
    created_at: datetime
    variants: list[ProductVariantOut]
