from pathlib import Path
from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from src.database import DBSession
from src.models import FaceEmbedding, Resident
from src.schemas import CreateResidentRequest, ResidentResponse, UpdateResidentRequest

router: APIRouter = APIRouter(
    prefix="/residents",
    tags=["Residents"],
)


@router.get(
    path="/",
    description="Endpoint untuk mendapatkan daftar semua penghuni.",
    response_model=list[ResidentResponse],
)
async def get_residents(
    db: DBSession, skip: int = 0, limit: int = 10
) -> Sequence[Resident]:
    return db.execute(select(Resident).offset(skip).limit(limit)).scalars().all()


@router.post(
    path="/",
    description="Endpoint untuk membuat penghuni baru.",
    response_model=ResidentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_resident(
    db: DBSession, create_resident_request: CreateResidentRequest
) -> Resident:
    stmt = select(Resident).where(
        (Resident.rfid_code == create_resident_request.rfid_code)
        | (Resident.pin == create_resident_request.pin)
        | (Resident.room_number == create_resident_request.room_number)
    )
    existing: Resident | None = db.execute(stmt).scalar_one_or_none()

    if existing:
        if existing.rfid_code == create_resident_request.rfid_code:
            detail = "Kode RFID sudah digunakan oleh penghuni lain."
        elif existing.pin == create_resident_request.pin:
            detail = "PIN sudah digunakan oleh penghuni lain."
        else:
            detail = "Nomor kamar sudah digunakan oleh penghuni lain."

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    new_resident: Resident = Resident(**create_resident_request.model_dump())
    db.add(new_resident)
    db.commit()
    db.refresh(new_resident)
    return new_resident


@router.get(
    path="/{resident_id}",
    description="Endpoint untuk mendapatkan detail penghuni berdasarkan ID.",
    response_model=ResidentResponse,
)
async def get_resident(db: DBSession, resident_id: UUID) -> Resident:
    resident: Resident | None = db.execute(
        select(Resident).where(Resident.id == resident_id)
    ).scalar_one_or_none()

    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Penghuni tidak ditemukan.",
        )
    return resident


@router.patch(
    path="/{resident_id}",
    description="Endpoint untuk memperbarui detail penghuni berdasarkan ID.",
    response_model=ResidentResponse,
)
async def update_resident(
    db: DBSession,
    resident_id: UUID,
    update_resident_request: UpdateResidentRequest,
) -> Resident:
    resident: Resident | None = db.execute(
        select(Resident).where(Resident.id == resident_id)
    ).scalar_one_or_none()

    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Penghuni tidak ditemukan.",
        )

    for key, value in update_resident_request.model_dump(exclude_unset=True).items():
        setattr(resident, key, value)

    db.commit()
    db.refresh(resident)
    return resident


@router.delete(
    path="/{resident_id}",
    description="Endpoint untuk menghapus penghuni berdasarkan ID beserta seluruh data embedding dan file gambar terkait.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_resident(db: DBSession, resident_id: UUID) -> None:
    resident: Resident | None = db.execute(
        select(Resident).where(Resident.id == resident_id)
    ).scalar_one_or_none()

    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Penghuni tidak ditemukan.",
        )

    stmt = select(FaceEmbedding).where(FaceEmbedding.resident_id == resident_id)
    embeddings = db.execute(stmt).scalars().all()
    image_paths: list[str] = [e.image_path for e in embeddings]

    db.delete(resident)
    db.commit()

    for path_str in image_paths:
        try:
            file_path: Path = Path(path_str)
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Gagal menghapus file fisik {path_str}: {e}")

    return None
