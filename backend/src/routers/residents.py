from pathlib import Path
from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import or_, select

from database import DBSession
from models import FaceEmbedding, Resident
from schemas import CreateResidentRequest, ResidentResponse, UpdateResidentRequest

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
    # Single query to check all duplicate constraints
    duplicate_check: Resident | None = db.execute(
        select(Resident).where(
            or_(
                Resident.rfid_code == create_resident_request.rfid_code,
                Resident.pin == create_resident_request.pin,
                Resident.room_number == create_resident_request.room_number,
            )
        )
    ).scalar_one_or_none()

    if duplicate_check:
        # Determine which field caused the conflict
        if duplicate_check.rfid_code == create_resident_request.rfid_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kode RFID sudah digunakan oleh penghuni lain.",
            )
        elif duplicate_check.pin == create_resident_request.pin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PIN sudah digunakan oleh penghuni lain.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nomor kamar sudah digunakan oleh penghuni lain.",
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


@router.get(
    path="/device/cache",
    description="Endpoint untuk mengekspor cache penghuni dalam format plain text yang mudah diparsing oleh ESP32.",
    response_class=PlainTextResponse,
)
async def export_residents_device_cache(db: DBSession) -> str:
    residents = (
        db.execute(select(Resident).order_by(Resident.room_number)).scalars().all()
    )

    # Format: id|rfid_code|pin|room_number per baris
    return "\n".join(
        f"{resident.id}|{resident.rfid_code}|{resident.pin}|{resident.room_number}"
        for resident in residents
    )


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

    # Validate uniqueness constraints for fields being updated
    data_to_update = update_resident_request.model_dump(exclude_unset=True)

    # Check all unique constraints with single query if updating relevant fields
    if any(field in data_to_update for field in ["rfid_code", "pin", "room_number"]):
        constraints = []

        if "rfid_code" in data_to_update:
            constraints.append(Resident.rfid_code == data_to_update["rfid_code"])
        if "pin" in data_to_update:
            constraints.append(Resident.pin == data_to_update["pin"])
        if "room_number" in data_to_update:
            constraints.append(Resident.room_number == data_to_update["room_number"])

        duplicate_check: Resident | None = db.execute(
            select(Resident).where(or_(*constraints) & (Resident.id != resident_id))
        ).scalar_one_or_none()

        if duplicate_check:
            # Determine which field caused the conflict
            if (
                "rfid_code" in data_to_update
                and duplicate_check.rfid_code == data_to_update["rfid_code"]
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Kode RFID sudah digunakan oleh penghuni lain.",
                )
            elif (
                "pin" in data_to_update and duplicate_check.pin == data_to_update["pin"]
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="PIN sudah digunakan oleh penghuni lain.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nomor kamar sudah digunakan oleh penghuni lain.",
                )

    for key, value in data_to_update.items():
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
