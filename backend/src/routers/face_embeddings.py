from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from src.config import settings
from src.database import DBSession
from src.models import FaceEmbedding, Resident
from src.schemas import (
    BulkFaceEmbeddingResponse,
    FaceEmbeddingResponse,
    FaceEmbeddingResult,
)
from src.utils import extract_embedding, read_upload_file_to_numpy, save_image_to_disk

router: APIRouter = APIRouter(
    prefix="/residents/{resident_id}/face-embeddings",
    tags=["Face Embeddings"],
)


@router.get(
    path="/",
    description="Endpoint untuk mendapatkan daftar semua vector embedding wajah yang terkait dengan penghuni tertentu.",
    response_model=list[FaceEmbeddingResponse],
)
async def get_face_embeddings(db: DBSession, resident_id: UUID) -> list[FaceEmbedding]:
    resident: Resident | None = db.execute(
        select(Resident).where(Resident.id == resident_id)
    ).scalar_one_or_none()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Penghuni dengan ID {resident_id} tidak ditemukan.",
        )

    stmt = select(FaceEmbedding).where(FaceEmbedding.resident_id == resident_id)
    return list(db.execute(stmt).scalars().all())


@router.post(
    path="/",
    description="Endpoint untuk membuat vector embedding wajah baru yang terkait dengan penghuni tertentu. Mendukung upload multiple file sekaligus.",
    response_model=BulkFaceEmbeddingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_face_embedding(
    db: DBSession, resident_id: UUID, files: list[UploadFile] = File(...)
) -> BulkFaceEmbeddingResponse:
    results: list[FaceEmbeddingResult] = []
    success_count: int = 0
    failed_count: int = 0
    upload_dir: Path = Path(settings.face_embedding_upload_dir)

    for file in files:
        saved_path: str = ""
        filename: str = file.filename or "unknown"
        try:
            image_data = read_upload_file_to_numpy(file)
            saved_path = save_image_to_disk(
                image_data, upload_dir, f"{resident_id}_{filename}"
            )
            embedding: list[float] = extract_embedding(image_data)

            new_entry: FaceEmbedding = FaceEmbedding(
                resident_id=resident_id, image_path=saved_path, embedding=embedding
            )
            db.add(new_entry)
            db.commit()

            success_count += 1
            results.append(
                FaceEmbeddingResult(
                    filename=filename, status="berhasil", image_path=saved_path
                )
            )
        except Exception as e:
            failed_count += 1
            db.rollback()
            if saved_path and Path(saved_path).exists():
                Path(saved_path).unlink()

            error_msg: str = str(e.detail) if isinstance(e, HTTPException) else str(e)
            results.append(
                FaceEmbeddingResult(filename=filename, status="gagal", error=error_msg)
            )

    return BulkFaceEmbeddingResponse(
        total_processed=len(files),
        total_success=success_count,
        total_failed=failed_count,
        results=results,
    )


@router.delete(
    path="/{face_embedding_id}",
    description="Endpoint untuk menghapus vector embedding wajah tertentu yang terkait dengan penghuni tertentu.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_face_embedding(
    db: DBSession, resident_id: UUID, face_embedding_id: UUID
) -> None:
    stmt = select(FaceEmbedding).where(
        FaceEmbedding.id == face_embedding_id, FaceEmbedding.resident_id == resident_id
    )
    face_embedding: FaceEmbedding | None = db.execute(stmt).scalar_one_or_none()

    if not face_embedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Face embedding dengan ID {face_embedding_id} tidak ditemukan untuk penghuni ini.",
        )

    try:
        path: Path = Path(face_embedding.image_path)
        if path.exists():
            path.unlink()
    except Exception as e:
        print(f"Gagal menghapus file fisik: {e}.")

    db.delete(face_embedding)
    db.commit()
