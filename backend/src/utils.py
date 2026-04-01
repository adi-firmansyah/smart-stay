import os
from pathlib import Path
from typing import Any, cast

import cv2
import numpy as np
from deepface import DeepFace
from fastapi import HTTPException, UploadFile, status

from src.config import settings


def validate_image_upload(file: UploadFile) -> None:
    """Validasi ukuran file dan ekstensi gambar."""
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


def read_upload_file_to_numpy(file: UploadFile) -> np.ndarray:
    """Mendekode buffer UploadFile FastAPI menjadi matriks numpy."""
    validate_image_upload(file)
    file_content: bytes = file.file.read()
    file_bytes: np.ndarray = np.frombuffer(file_content, np.uint8)
    image: np.ndarray | None = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gagal mendekode gambar.",
        )
    return image


def save_image_to_disk(image_data: np.ndarray, directory: Path, filename: str) -> str:
    """Menyimpan matriks numpy ke disk dan mengembalikan path absolut."""
    directory.mkdir(parents=True, exist_ok=True)
    target_path: Path = directory / filename
    success: bool = cv2.imwrite(str(target_path), image_data)

    if not success:
        raise IOError(f"Gagal menyimpan gambar ke {target_path}")
    return str(target_path.resolve())


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
            raise ValueError("Tidak ada wajah yang terdeteksi atau embedding kosong.")

        return cast(list[float], results[0]["embedding"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gagal mengekstraksi wajah: {str(e)}",
        )
