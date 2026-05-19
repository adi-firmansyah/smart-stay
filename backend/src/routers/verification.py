import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from logging import getLogger
from pathlib import Path
from threading import Lock
from typing import cast
from uuid import UUID, uuid4

import httpx
import numpy as np
from config import settings
from database import DBSession
from fastapi import APIRouter, Body, HTTPException, status
from models import AccessLog, AccessMethodEnum, FaceEmbedding, Resident
from schemas import VerificationResponse
from sqlalchemy import select
from utils import (
    decode_image_from_buffer,
    extract_embedding,
    handle_suspicious_activity,
    save_image_to_disk,
)
from ws import access_log_event, manager

logger = getLogger(__name__)

router: APIRouter = APIRouter(
    prefix="/verification",
    tags=["Verification"],
)


class RFIDCaptureState:
    """Thread-safe storage untuk RFID capture state. Mencegah race conditions pada concurrent requests."""

    def __init__(self) -> None:
        self._lock: Lock = Lock()
        self._event_id: int = 0
        self._uid: str | None = None
        self._captured_at: datetime | None = None

    def capture(self, uid: str) -> dict[str, int | str | None]:
        """Catat UID RFID dan kembalikan response dengan event_id yang ter-increment."""
        with self._lock:
            self._event_id += 1
            self._uid = uid
            self._captured_at = datetime.now(timezone.utc)
            return self._build_response()

    def get_latest(self, after_event_id: int) -> dict[str, int | str | None]:
        """Ambil latest capture jika event_id lebih baru dari after_event_id."""
        with self._lock:
            if self._event_id <= after_event_id:
                return {"event_id": self._event_id, "uid": None, "captured_at": None}
            return self._build_response()

    def _build_response(self) -> dict[str, int | str | None]:
        """Build response dict dengan state terkini (harus dipanggil dengan lock terjaga)."""
        return {
            "event_id": self._event_id,
            "uid": self._uid,
            "captured_at": self._captured_at.isoformat() if self._captured_at else None,
        }


rfid_state: RFIDCaptureState = RFIDCaptureState()


async def broadcast_access_log(access_log: AccessLog) -> None:
    """Broadcast access log event ke websocket; gagal broadcast tidak mengganggu request utama."""
    try:
        log_dict = {
            "id": str(access_log.id),
            "resident_id": (
                str(access_log.resident_id) if access_log.resident_id else None
            ),
            "method": access_log.method.value,
            "granted": bool(access_log.granted),
            "similarity": float(access_log.similarity),
            "image_path": access_log.image_path,
            "source_device_id": access_log.source_device_id,
            "source_log_id": access_log.source_log_id,
            "created_at": access_log.created_at.isoformat(),
        }
        await manager.broadcast_json(access_log_event(log_dict))
    except Exception as exc:
        logger.warning("Gagal broadcast access log event: %s", exc)


async def fetch_esp32_cam_image() -> bytes:
    """Ambil image dari ESP32-CAM dengan retry singkat agar tidak mudah gagal saat koneksi fluktuatif."""
    last_error: Exception | None = None
    logger.info(
        f"[FACE_VERIFY] Memulai fetch ESP32-CAM dari URL: {settings.esp32_cam_url}"
    )

    for attempt in range(2):
        async with httpx.AsyncClient() as client:
            try:
                logger.info(
                    f"[FACE_VERIFY] Attempt {attempt + 1}: Mengirim GET request ke ESP32-CAM (timeout=5.0s)"
                )
                resp = await client.get(settings.esp32_cam_url, timeout=5.0)
                logger.info(
                    f"[FACE_VERIFY] Attempt {attempt + 1}: Status code = {resp.status_code}, Content length = {len(resp.content)} bytes"
                )

                if resp.status_code == 200:
                    logger.info(
                        f"[FACE_VERIFY] ✓ Berhasil fetch image ({len(resp.content)} bytes)"
                    )
                    return resp.content

                last_error = HTTPException(status_code=status.HTTP_502_BAD_GATEWAY)
                logger.warning(
                    f"[FACE_VERIFY] ESP32 camera returned status {resp.status_code} on attempt {attempt + 1}",
                )
            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning(
                    f"[FACE_VERIFY] TIMEOUT - Gagal terhubung ke ESP32-CAM pada attempt {attempt + 1}: {exc}",
                )
            except httpx.RequestError as exc:
                last_error = exc
                logger.warning(
                    f"[FACE_VERIFY] REQUEST ERROR - Gagal terhubung ke ESP32-CAM pada attempt {attempt + 1}: {exc}",
                )

        if attempt == 0:
            await asyncio.sleep(0.2)

    if isinstance(last_error, HTTPException):
        logger.error(
            f"[FACE_VERIFY] ✗ ESP32-CAM merespons tetapi statusnya tidak valid (502)"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ESP32-CAM merespons tetapi statusnya tidak valid.",
        )

    logger.error(
        f"[FACE_VERIFY] ✗ Tidak dapat terhubung ke ESP32-CAM (503) - Last error: {last_error}"
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Tidak dapat terhubung ke ESP32-CAM.",
    )


@router.post(
    path="/face",
    description="Endpoint untuk verifikasi wajah dengan penyimpanan log citra pada kolom image_path.",
    response_model=VerificationResponse,
)
async def verify_by_face(db: DBSession) -> VerificationResponse:
    """
    Verifikasi wajah menggunakan image dari ESP32 camera.
    Mengekstraksi embedding dan membandingkan dengan database.
    """
    logger.info("[FACE_VERIFY] ===== START FACE VERIFICATION REQUEST =====")
    similarity_score: float = 0.0
    resident_id: UUID | None = None
    raw_image: np.ndarray | None = None
    saved_image_path: str | None = None
    upload_dir: Path = Path(settings.face_verification_upload_dir)

    # Ambil image dari camera
    try:
        logger.info("[FACE_VERIFY] Step 1: Fetching image from ESP32-CAM")
        camera_buffer = await fetch_esp32_cam_image()
        logger.info(
            f"[FACE_VERIFY] Step 2: Decoding image buffer ({len(camera_buffer)} bytes)"
        )
        raw_image = decode_image_from_buffer(camera_buffer)
        logger.info(
            f"[FACE_VERIFY] Step 3: Image decoded successfully, shape={raw_image.shape}"
        )

        filename: str = f"face_{uuid4().hex}.jpg"
        saved_image_path = save_image_to_disk(raw_image, upload_dir, filename)
        logger.info(f"[FACE_VERIFY] Step 4: Image saved to {saved_image_path}")
    except HTTPException as http_exc:
        logger.error(
            f"[FACE_VERIFY] ✗ HTTP Error during image fetch: {http_exc.status_code} - {http_exc.detail}"
        )
        raise
    except Exception as e:
        logger.error(
            f"[FACE_VERIFY] ✗ Unexpected error mengambil/menyimpan image: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Ekstraksi embedding dan cari matching resident
    try:
        logger.info("[FACE_VERIFY] Step 5: Extracting face embedding from image")
        query_embedding: list[float] = extract_embedding(raw_image)
        logger.info(
            f"[FACE_VERIFY] Step 6: Embedding extracted, dim={len(query_embedding)}"
        )

        logger.info("[FACE_VERIFY] Step 7: Querying FaceEmbedding table for best match")
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
            logger.info(
                f"[FACE_VERIFY] Step 8: Best match found - resident_id={resident_id}, similarity={similarity_score:.4f}"
            )
        else:
            logger.info(
                f"[FACE_VERIFY] Step 8: No face embeddings in database to compare against"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[FACE_VERIFY] ✗ Error ekstraksi/matching embedding: {e}", exc_info=True
        )
        # Lanjutkan dengan similarity_score = 0.0 (rejection)

    is_granted: bool = similarity_score >= settings.deepface_threshold
    logger.info(
        f"[FACE_VERIFY] Step 9: Decision - similarity_score({similarity_score:.4f}) >= threshold({settings.deepface_threshold})? {is_granted}"
    )

    event_time = datetime.now(timezone.utc)
    access_log = AccessLog(
        resident_id=resident_id if is_granted else None,
        method=AccessMethodEnum.FACE_RECOGNITION,
        granted=is_granted,
        similarity=Decimal(f"{max(0.0, similarity_score * 100):.2f}"),
        image_path=saved_image_path,
        created_at=event_time,
        updated_at=event_time,
    )

    db.add(access_log)
    try:
        logger.info("[FACE_VERIFY] Step 10: Saving access log to database")
        db.flush()
        db.commit()
        logger.info(f"[FACE_VERIFY] Step 11: Access log saved with id={access_log.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"[FACE_VERIFY] ✗ Error menyimpan access log: {e}", exc_info=True)
        if saved_image_path and Path(saved_image_path).exists():
            try:
                Path(saved_image_path).unlink()
            except Exception as cleanup_error:
                logger.warning(
                    f"[FACE_VERIFY] Gagal menghapus image temp: {cleanup_error}"
                )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    logger.info("[FACE_VERIFY] Step 12: Broadcasting WebSocket event")
    await broadcast_access_log(access_log)
    logger.info("[FACE_VERIFY] Step 13: WebSocket event broadcast complete")

    logger.info(
        f"[FACE_VERIFY] ===== END FACE VERIFICATION (granted={is_granted}) ====="
    )
    return VerificationResponse(
        granted=is_granted,
        method=AccessMethodEnum.FACE_RECOGNITION,
        resident_id=resident_id if is_granted else None,
        similarity=Decimal(f"{max(0.0, similarity_score * 100):.2f}"),
        message="Akses diterima" if is_granted else "Wajah tidak dikenali",
    )


@router.post(
    path="/rfid",
    description="Endpoint untuk verifikasi RFID. Menerima kode RFID dan memeriksa kecocokannya dengan database.",
    response_model=VerificationResponse,
)
async def verify_by_rfid(
    db: DBSession, rfid_code: str = Body(..., embed=True)
) -> VerificationResponse:
    """
    Verifikasi RFID dengan pencarian resident berdasarkan rfid_code.
    Menghasilkan AccessLog dan menangani suspicious activity jika tidak ditemukan.
    """
    res: Resident | None = db.execute(
        select(Resident).where(Resident.rfid_code == rfid_code)
    ).scalar_one_or_none()

    is_granted: bool = res is not None
    suspicious_path: str | None = None

    if not is_granted:
        suspicious_path = await handle_suspicious_activity(db, AccessMethodEnum.RFID)

    event_time = datetime.now(timezone.utc)
    access_log = AccessLog(
        resident_id=res.id if is_granted else None,
        method=AccessMethodEnum.RFID,
        granted=is_granted,
        similarity=Decimal("100.00") if is_granted else Decimal("0.00"),
        image_path=suspicious_path,
        created_at=event_time,
        updated_at=event_time,
    )

    db.add(access_log)
    try:
        db.flush()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error menyimpan RFID verification log: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    await broadcast_access_log(access_log)

    return VerificationResponse(
        granted=is_granted,
        method=AccessMethodEnum.RFID,
        resident_id=res.id if is_granted else None,
        similarity=Decimal("100.00") if is_granted else Decimal("0.00"),
        message="Akses diterima" if is_granted else "RFID tidak dikenal",
    )


@router.post(
    path="/rfid/capture",
    description="Endpoint untuk menyimpan UID RFID terakhir hasil mode baca pada perangkat.",
)
async def capture_rfid_uid(
    rfid_code: str = Body(..., embed=True)
) -> dict[str, int | str | None]:
    """Catat RFID UID terakhir dengan thread-safe manner."""
    uid: str = rfid_code.strip().upper()
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rfid_code tidak boleh kosong.",
        )

    return rfid_state.capture(uid)


@router.get(
    path="/rfid/capture/latest",
    description="Endpoint untuk mengambil UID RFID terakhir untuk kebutuhan auto-fill form pendaftaran penghuni.",
)
async def get_latest_captured_rfid(
    after_event_id: int = 0,
) -> dict[str, int | str | None]:
    """Ambil latest RFID capture state dengan thread-safe manner."""
    return rfid_state.get_latest(after_event_id)


@router.post(
    path="/pin",
    description="Endpoint untuk verifikasi PIN. Menerima PIN dan memeriksa kecocokannya dengan database.",
    response_model=VerificationResponse,
)
async def verify_by_pin(
    db: DBSession, pin: str = Body(..., embed=True)
) -> VerificationResponse:
    """
    Verifikasi PIN dengan pencarian resident berdasarkan pin.
    Menghasilkan AccessLog dan menangani suspicious activity jika tidak ditemukan.
    """
    res: Resident | None = db.execute(
        select(Resident).where(Resident.pin == pin)
    ).scalar_one_or_none()

    is_granted: bool = res is not None
    suspicious_path: str | None = None

    if not is_granted:
        suspicious_path = await handle_suspicious_activity(db, AccessMethodEnum.PIN)

    event_time = datetime.now(timezone.utc)
    access_log = AccessLog(
        resident_id=res.id if is_granted else None,
        method=AccessMethodEnum.PIN,
        granted=is_granted,
        similarity=Decimal("100.00") if is_granted else Decimal("0.00"),
        image_path=suspicious_path,
        created_at=event_time,
        updated_at=event_time,
    )

    db.add(access_log)
    try:
        db.flush()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error menyimpan PIN verification log: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    await broadcast_access_log(access_log)

    return VerificationResponse(
        granted=is_granted,
        method=AccessMethodEnum.PIN,
        resident_id=res.id if is_granted else None,
        similarity=Decimal("100.00") if is_granted else Decimal("0.00"),
        message="Akses diterima" if is_granted else "PIN tidak valid",
    )
