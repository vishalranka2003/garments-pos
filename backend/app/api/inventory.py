import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.db.session import get_db
from app.schemas.inventory import InventoryItemOut, InventoryUpdate
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=list[InventoryItemOut])
async def list_inventory(
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> list[InventoryItemOut]:
    return await inventory_service.list_inventory(db, store_id, current_user.clerk_user_id)


@router.put("/{variant_id}", response_model=InventoryItemOut)
async def update_inventory(
    variant_id: uuid.UUID,
    payload: InventoryUpdate,
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> InventoryItemOut:
    variant, product = await inventory_service.update_stock(
        db=db,
        variant_id=variant_id,
        store_id=store_id,
        stock_quantity=payload.stock_quantity,
        clerk_user_id=current_user.clerk_user_id,
    )
    return InventoryItemOut(
        variant_id=variant.id,
        product_id=variant.product_id,
        product_name=product.name,
        sku=variant.sku,
        size=variant.size,
        color=variant.color,
        stock_quantity=variant.stock_quantity,
        price=float(variant.price),
    )
