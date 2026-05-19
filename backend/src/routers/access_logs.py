from datetime import datetime, timezone
from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import joinedload

from database import DBSession
from models import AccessLog, AccessMethodEnum, Resident
from ws import manager, access_log_event
from schemas import (
    AccessLogResponse,
    AccessLogSyncResult,
    BulkAccessLogSyncRequest,
    BulkAccessLogSyncResponse,
)

router = APIRouter(
    prefix="/access-logs",
    tags=["Access Logs"],
)


@router.get(
    path="/",
    description="Mendapatkan daftar log akses dengan filter metode, status, dan pagination.",
    response_model=list[AccessLogResponse],
)
async def get_access_logs(
    db: DBSession,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    method: AccessMethodEnum | None = None,
    granted: bool | None = None,
) -> Sequence[AccessLog]:
    stmt = (
        select(AccessLog)
        .options(joinedload(AccessLog.resident))
        .order_by(desc(AccessLog.created_at))
        .offset(offset)
        .limit(limit)
    )

    if method is not None:
        stmt = stmt.where(AccessLog.method == method)
    if granted is not None:
        stmt = stmt.where(AccessLog.granted == granted)

    return db.execute(stmt).scalars().all()


@router.get(
    path="/{access_log_id}",
    description="Mendapatkan detail log akses berdasarkan ID, termasuk informasi penghuni jika tersedia.",
    response_model=AccessLogResponse,
)
async def get_access_log(db: DBSession, access_log_id: UUID) -> AccessLog:
    stmt = (
        select(AccessLog)
        .options(joinedload(AccessLog.resident))
        .where(AccessLog.id == access_log_id)
    )

    result = db.execute(stmt).scalar_one_or_none()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log akses tidak ditemukan.",
        )

    return result


@router.post(
    path="/sync",
    description="Sinkronisasi batch access logs dari ESP32 setelah perangkat kembali online.",
    response_model=BulkAccessLogSyncResponse,
)
async def sync_access_logs(
    db: DBSession, payload: BulkAccessLogSyncRequest
) -> BulkAccessLogSyncResponse:
    inserted_count = 0
    skipped_count = 0
    failed_count = 0
    results: list[AccessLogSyncResult] = []

    for item in payload.items:
        savepoint = db.begin_nested()
        try:
            existing_log = db.execute(
                select(AccessLog.id).where(
                    AccessLog.source_device_id == item.source_device_id,
                    AccessLog.source_log_id == item.source_log_id,
                )
            ).scalar_one_or_none()

            if existing_log:
                savepoint.rollback()
                skipped_count += 1
                results.append(
                    AccessLogSyncResult(
                        source_device_id=item.source_device_id,
                        source_log_id=item.source_log_id,
                        status="skipped",
                    )
                )
                continue

            resident_id = item.resident_id
            if resident_id is not None:
                resident_exists = db.execute(
                    select(Resident.id).where(Resident.id == resident_id)
                ).scalar_one_or_none()
                if resident_exists is None:
                    resident_id = None

            event_created_at = item.created_at or datetime.now(timezone.utc)
            access_log = AccessLog(
                resident_id=resident_id,
                method=item.method,
                granted=item.granted,
                similarity=Decimal(item.similarity),
                image_path=item.image_path,
                source_device_id=item.source_device_id,
                source_log_id=item.source_log_id,
                created_at=event_created_at,
                updated_at=event_created_at,
            )
            db.add(access_log)
            db.flush()
            # prepare broadcast payload for the newly inserted log
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
            savepoint.commit()
            # broadcast asynchronously (non-blocking for the sync loop)
            try:
                await manager.broadcast_json(access_log_event(log_dict))
            except Exception:
                # swallow broadcasting errors; sync still succeeded
                pass
            inserted_count += 1
            results.append(
                AccessLogSyncResult(
                    source_device_id=item.source_device_id,
                    source_log_id=item.source_log_id,
                    status="inserted",
                )
            )
        except Exception as exc:
            failed_count += 1
            savepoint.rollback()
            results.append(
                AccessLogSyncResult(
                    source_device_id=item.source_device_id,
                    source_log_id=item.source_log_id,
                    status="failed",
                    error=str(exc),
                )
            )

    db.commit()

    return BulkAccessLogSyncResponse(
        total_processed=len(payload.items),
        total_inserted=inserted_count,
        total_skipped=skipped_count,
        total_failed=failed_count,
        results=results,
    )
