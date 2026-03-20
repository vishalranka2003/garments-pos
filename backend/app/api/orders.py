from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.db.session import get_db
from app.schemas.order import OrderCreate, OrderOut
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> OrderOut:
    order = await order_service.create_order(db, payload, current_user.clerk_user_id)
    return OrderOut.model_validate(order)
