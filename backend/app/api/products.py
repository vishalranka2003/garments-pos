import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.db.session import get_db
from app.schemas.inventory import InventoryItemOut
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services import inventory_service
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> ProductOut:
    product = await product_service.create_product(db, payload, current_user.clerk_user_id)
    return ProductOut.model_validate(product)


@router.get("", response_model=list[ProductOut])
async def list_products(
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> list[ProductOut]:
    products = await product_service.list_products(db, store_id, current_user.clerk_user_id)
    return [ProductOut.model_validate(product) for product in products]


@router.get("/variant/by-sku", response_model=InventoryItemOut)
async def get_variant_by_sku(
    store_id: uuid.UUID = Query(...),
    sku: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> InventoryItemOut:
    return await inventory_service.get_inventory_item_by_sku(
        db=db,
        store_id=store_id,
        sku=sku,
        clerk_user_id=current_user.clerk_user_id,
    )


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: uuid.UUID,
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> ProductOut:
    product = await product_service.get_product(db, product_id, store_id, current_user.clerk_user_id)
    return ProductOut.model_validate(product)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> ProductOut:
    product = await product_service.update_product(
        db,
        product_id,
        store_id,
        payload,
        current_user.clerk_user_id,
    )
    return ProductOut.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> Response:
    await product_service.delete_product(db, product_id, store_id, current_user.clerk_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
