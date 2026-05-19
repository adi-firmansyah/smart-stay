from datetime import datetime, time
from typing import Any

import models
from database import DBSession
from fastapi import APIRouter
from schemas import DashboardStatsResponse
from sqlalchemy import case, func, select
from sqlalchemy.orm import selectinload

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    path="/stats",
    description="Endpoint untuk mendapatkan statistik dashboard, termasuk jumlah penghuni, jumlah akses hari ini, dan log akses terbaru.",
    response_model=DashboardStatsResponse,
)
def get_dashboard_stats(db: DBSession) -> Any:
    # 1. Tentukan rentang waktu hari ini (00:00:00)
    today_start = datetime.combine(datetime.now().date(), time.min)

    # 2. Hitung Total Penghuni
    total_residents = db.scalar(select(func.count(models.Resident.id))) or 0

    # 3. Hitung statistik akses hari ini menggunakan database aggregation (efficient)
    stats_stmt = select(
        func.count(models.AccessLog.id).label("total_access"),
        func.sum(case((models.AccessLog.granted == True, 1), else_=0)).label(
            "total_valid"
        ),
        func.sum(case((models.AccessLog.granted == False, 1), else_=0)).label(
            "total_invalid"
        ),
    ).where(models.AccessLog.created_at >= today_start)

    stats_result = db.execute(stats_stmt).one()
    total_access_today = stats_result.total_access or 0
    total_valid = stats_result.total_valid or 0
    total_invalid = stats_result.total_invalid or 0

    # 4. Ambil 10 aktivitas terbaru dengan efficient loading
    stmt = (
        select(models.AccessLog)
        .options(selectinload(models.AccessLog.resident))
        .where(models.AccessLog.created_at >= today_start)
        .order_by(models.AccessLog.created_at.desc())
        .limit(10)
    )
    access_logs = db.scalars(stmt).all()

    return {
        "total_residents": total_residents,
        "total_access_today": total_access_today,
        "total_valid_access": total_valid,
        "total_invalid_access": total_invalid,
        "access_logs": access_logs,
    }
