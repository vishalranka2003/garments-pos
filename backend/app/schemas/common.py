import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MoneySummary(BaseModel):
    total_amount: Decimal
    discount: Decimal
    final_amount: Decimal


class IdResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime
