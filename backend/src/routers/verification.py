from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import cast
from uuid import UUID, uuid4

import httpx
import numpy as np
from fastapi import APIRouter, Body, HTTPException, status
from sqlalchemy import select

from src.config import settings
from src.database import DBSession
from src.models import AccessLog, AccessMethodEnum, FaceEmbedding, Resident
from src.utils import (
    decode_image_from_buffer,
    extract_embedding,
    handle_suspicious_activity,
    save_image_to_disk,
)

router: APIRouter = APIRouter(
    prefix="/verification",
    tags=["Verification"],
)


rfid_capture_event_id: int = 0
rfid_capture_uid: str | None = None
rfid_capture_at: datetime | None = None


def build_rfid_capture_response() -> dict[str, int | str | None]:
    return {
        "event_id": rfid_capture_event_id,
        "uid": rfid_capture_uid,
        "captured_at": rfid_capture_at.isoformat() if rfid_capture_at else None,
    }


@router.post(
    path="/face",
    description="Endpoint untuk verifikasi wajah dengan penyimpanan log citra pada kolom image_path.",
)
async def verify_by_face(db: DBSession) -> bool:
    similarity_score: float = 0.0
    resident_id: UUID | None = None
    raw_image: np.ndarray | None = None
    saved_image_path: str | None = None
    upload_dir: Path = Path(settings.face_verification_upload_dir)

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(settings.esp32_cam_url, timeout=15.0)
            if resp.status_code != 200:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY)

            raw_image = decode_image_from_buffer(resp.content)
            filename: str = f"face_{uuid4().hex}.jpg"
            saved_image_path = save_image_to_disk(raw_image, upload_dir, filename)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        query_embedding: list[float] = extract_embedding(raw_image)
        stmt = (
            select(
                FaceEmbedding.resident_id,
                (1 - FaceEmbedding.embedding.cosine_distance(query_embedding)).label(
                    "sim"
                ),
            )
            .order_by(FaceEmbedding.embedding.cosine_distance(query_embedding))
            .limit(1)
        )
        result = db.execute(stmt).first()
        if result:
            resident_id = cast(UUID, result.resident_id)
            similarity_score = float(result.sim)
    except Exception:
        pass

    is_granted: bool = similarity_score >= settings.deepface_threshold

    db.add(
        AccessLog(
            resident_id=resident_id if is_granted else None,
            method=AccessMethodEnum.FACE_RECOGNITION,
            granted=is_granted,
            similarity=Decimal(f"{max(0.0, similarity_score * 100):.2f}"),
            image_path=saved_image_path,
        )
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        if saved_image_path and Path(saved_image_path).exists():
            Path(saved_image_path).unlink()
        raise

    return is_granted


@router.post(
    path="/rfid",
    description="Endpoint untuk verifikasi RFID. Menerima kode RFID dan memeriksa kecocokannya dengan database.",
)
async def verify_by_rfid(db: DBSession, rfid_code: str = Body(..., embed=True)) -> bool:
    res = db.execute(
        select(Resident).where(Resident.rfid_code == rfid_code)
    ).scalar_one_or_none()

    is_granted: bool = res is not None
    suspicious_path: str | None = None

    if not is_granted:
        suspicious_path = await handle_suspicious_activity(db, AccessMethodEnum.RFID)

    db.add(
        AccessLog(
            resident_id=res.id if is_granted else None,
            method=AccessMethodEnum.RFID,
            granted=is_granted,
            similarity=Decimal("100.00") if is_granted else Decimal("0.00"),
            image_path=suspicious_path,
        )
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return is_granted


@router.post(
    path="/rfid/capture",
    description="Endpoint untuk menyimpan UID RFID terakhir hasil mode baca pada perangkat.",
)
async def capture_rfid_uid(
    rfid_code: str = Body(..., embed=True)
) -> dict[str, int | str | None]:
    global rfid_capture_at, rfid_capture_event_id, rfid_capture_uid

    uid = rfid_code.strip().upper()
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rfid_code tidak boleh kosong.",
        )

    rfid_capture_event_id += 1
    rfid_capture_uid = uid
    rfid_capture_at = datetime.now(timezone.utc)
    return build_rfid_capture_response()


@router.get(
    path="/rfid/capture/latest",
    description="Endpoint untuk mengambil UID RFID terakhir untuk kebutuhan auto-fill form pendaftaran penghuni.",
)
async def get_latest_captured_rfid(
    after_event_id: int = 0,
) -> dict[str, int | str | None]:
    latest_event_id = rfid_capture_event_id
    if latest_event_id <= after_event_id:
        return {
            "event_id": latest_event_id,
            "uid": None,
            "captured_at": None,
        }
    return build_rfid_capture_response()


@router.post(
    path="/pin",
    description="Endpoint untuk verifikasi PIN. Menerima PIN dan memeriksa kecocokannya dengan database.",
)
async def verify_by_pin(db: DBSession, pin: str = Body(..., embed=True)) -> bool:
    res = db.execute(select(Resident).where(Resident.pin == pin)).scalar_one_or_none()

    is_granted: bool = res is not None
    suspicious_path: str | None = None

    if not is_granted:
        suspicious_path = await handle_suspicious_activity(db, AccessMethodEnum.PIN)

    db.add(
        AccessLog(
            resident_id=res.id if is_granted else None,
            method=AccessMethodEnum.PIN,
            granted=is_granted,
            similarity=Decimal("100.00") if is_granted else Decimal("0.00"),
            image_path=suspicious_path,
        )
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return is_granted
