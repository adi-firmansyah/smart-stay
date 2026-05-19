from fastapi import APIRouter, Body, HTTPException, status
from sqlalchemy import select, update

from database import DBSession
from models import Gate

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
) -> dict[str, bool]:
    """
    Update status kunci gerbang.

    Args:
        db: Database session.
        is_locked: Status kunci gerbang (True = terkunci, False = terbuka).

    Returns:
        dict dengan field 'locked' yang menunjukkan status terbaru.

    Raises:
        HTTPException: Jika gerbang tidak ditemukan atau update gagal.
    """
    try:
        # Verify gate exists
        gate: Gate | None = db.execute(select(Gate).limit(1)).scalar_one_or_none()

        if not gate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gerbang tidak ditemukan dalam sistem.",
            )

        # Update gate status
        stmt = update(Gate).values(locked=is_locked)
        db.execute(stmt)
        db.commit()

        return {"locked": is_locked}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengupdate status gerbang: {str(e)}",
        )
