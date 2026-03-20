import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.db.session import get_db
from app.schemas.dashboard import DashboardSummaryOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def get_summary(
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
) -> DashboardSummaryOut:
    return await dashboard_service.get_dashboard_summary(db, store_id, current_user.clerk_user_id)
