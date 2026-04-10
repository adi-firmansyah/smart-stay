import os
import time
from pathlib import Path
from typing import Any, cast

import cv2
import httpx
import numpy as np
from deepface import DeepFace
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import desc, select

from src.config import settings
from src.database import DBSession
from src.models import AccessLog, AccessMethodEnum


def validate_image_upload(file: UploadFile) -> None:
    """Validasi ukuran file dan ekstensi gambar dari form data."""
    filename: str = file.filename or ""
    extension: str = filename.split(".")[-1].lower() if "." in filename else ""
    allowed: list[str] = settings.allowed_extensions.split(",")

    if extension not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ekstensi file tidak diizinkan. Gunakan: {settings.allowed_extensions}.",
        )

    file.file.seek(0, os.SEEK_END)
    file_size: int = file.file.tell()
    file.file.seek(0)

    if file_size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Ukuran file terlalu besar. Maksimal {settings.max_file_size_mb}MB.",
        )


def decode_image_from_buffer(buffer: bytes) -> np.ndarray:
    """Mendekode buffer bytes menjadi matriks numpy OpenCV."""
    file_bytes: np.ndarray = np.frombuffer(buffer, np.uint8)
    image: np.ndarray | None = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gagal mendekode gambar dari buffer.",
        )
    return image


def read_upload_file_to_numpy(file: UploadFile) -> np.ndarray:
    """Mendekode UploadFile menjadi matriks numpy setelah validasi."""
    validate_image_upload(file)
    return decode_image_from_buffer(file.file.read())


def save_image_to_disk(image_data: np.ndarray, directory: Path, filename: str) -> str:
    """Menyimpan matriks numpy ke disk dan mengembalikan path relatif."""
    directory.mkdir(parents=True, exist_ok=True)
    target_path: Path = directory / filename
    success: bool = cv2.imwrite(str(target_path), image_data)

    if not success:
        raise IOError(f"Gagal menyimpan gambar ke {target_path}")
    return target_path.as_posix()


def extract_embedding(image_data: np.ndarray) -> list[float]:
    """Ekstraksi vector embedding menggunakan DeepFace."""
    try:
        results: list[dict[str, Any]] = cast(
            list[dict[str, Any]],
            DeepFace.represent(
                img_path=image_data,
                model_name=settings.deepface_model,
                enforce_detection=True,
                detector_backend=settings.deepface_detector,
                align=True,
            ),
        )

        if not results:
            raise ValueError("Tidak ada wajah yang terdeteksi.")

        return cast(list[float], results[0]["embedding"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gagal mengekstraksi wajah: {str(e)}",
        )


async def handle_suspicious_activity(
    db: DBSession,
    method: AccessMethodEnum,
    raw_image: np.ndarray | None = None,
) -> str | None:
    """
    Memeriksa 4 kegagalan sebelumnya. Jika total mencapai 5 kegagalan berturut-turut,
    simpan foto dari buffer atau ambil foto baru dari kamera.
    """
    stmt = select(AccessLog.granted).order_by(desc(AccessLog.created_at)).limit(4)
    last_logs: list[bool] = list(db.execute(stmt).scalars().all())

    if len(last_logs) == 4 and all(not g for g in last_logs):
        image_to_save: np.ndarray | None = raw_image

        if image_to_save is None:
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(settings.esp32_cam_url, timeout=3.0)
                    if resp.status_code == 200:
                        image_to_save = decode_image_from_buffer(resp.content)
            except Exception:
                return None

        if image_to_save is not None:
            filename: str = f"suspicious_{method.value}_{int(time.time())}.jpg"
            save_dir: Path = Path(settings.suspicious_verification_upload_dir)
            return save_image_to_disk(image_to_save, save_dir, filename)

    return None
