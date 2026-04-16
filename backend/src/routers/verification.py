from decimal import Decimal
from pathlib import Path
from typing import cast
from uuid import UUID, uuid4

import httpx
import numpy as np
from fastapi import APIRouter, Body
from sqlalchemy import select

from src.config import settings
from src.database import DBSession
from src.models import AccessLog, AccessMethodEnum, FaceEmbedding, Resident
from src.utils import (
    decode_image_from_buffer,
    extract_embedding,
    handle_suspicious_activity,
    save_image_to_disk,
    update_gate_lock_status,
)

router: APIRouter = APIRouter(prefix="/verification", tags=["Verification"])


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

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.esp32_cam_url, timeout=5.0)

            if resp.status_code == 200:
                raw_image = decode_image_from_buffer(resp.content)

                filename: str = f"face_{uuid4().hex}.jpg"
                saved_image_path = save_image_to_disk(raw_image, upload_dir, filename)

                query_embedding: list[float] = extract_embedding(raw_image)

                stmt = (
                    select(
                        FaceEmbedding.resident_id,
                        (
                            1 - FaceEmbedding.embedding.cosine_distance(query_embedding)
                        ).label("sim"),
                    )
                    .order_by(FaceEmbedding.embedding.cosine_distance(query_embedding))
                    .limit(1)
                )

                result = db.execute(stmt).first()
                if result:
                    resident_id = cast(UUID, result.resident_id)
                    similarity_score = float(result.sim)

    except Exception as e:
        print(f"Error pada verifikasi wajah: {str(e)}")

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

    if is_granted:
        update_gate_lock_status(db, is_locked=False)

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

    if is_granted:
        update_gate_lock_status(db, is_locked=False)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return is_granted


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

    if is_granted:
        update_gate_lock_status(db, is_locked=False)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return is_granted
