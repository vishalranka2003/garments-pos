from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.db.session import get_db
from app.models.store import Store

router = APIRouter(prefix="/stores", tags=["Stores"])


class StoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class StoreOut(BaseModel):
    id: str
    name: str
    owner_id: str


@router.post("", response_model=StoreOut, status_code=status.HTTP_201_CREATED)
async def create_store(
    payload: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> StoreOut:
    store = Store(name=payload.name, owner_id=current_user.clerk_user_id)
    db.add(store)
    await db.commit()
    await db.refresh(store)
    return StoreOut(id=str(store.id), name=store.name, owner_id=store.owner_id)


@router.get("", response_model=list[StoreOut])
async def list_stores(
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> list[StoreOut]:
    stores = await db.scalars(
        select(Store).where(Store.owner_id == current_user.clerk_user_id).order_by(Store.created_at.desc())
    )
    return [StoreOut(id=str(store.id), name=store.name, owner_id=store.owner_id) for store in stores.all()]
