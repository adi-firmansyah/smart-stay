from fastapi import APIRouter, Body
from sqlalchemy import update

from src.database import DBSession
from src.models import Gate

router = APIRouter(
    prefix="/gate",
    tags=["Gate"],
)


@router.patch(
    path="/status",
    description="Update status penguncian gerbang berdasarkan sensor fisik ESP32.",
)
async def update_gate_status(
    db: DBSession, is_locked: bool = Body(..., embed=True)
) -> bool:
    try:
        stmt = update(Gate).values(locked=is_locked)
        db.execute(stmt)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
