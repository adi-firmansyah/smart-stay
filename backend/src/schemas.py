from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from src.models import AccessMethodEnum


class CreateResidentRequest(BaseModel):
    """Schema untuk request pembuatan penghuni baru."""

    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20, pattern=r"^[0-9]+$")
    room_number: int = Field(..., gt=0)
    rfid_code: str = Field(..., min_length=8, max_length=20, pattern=r"^[0-9A-Fa-f]+$")
    pin: str = Field(..., min_length=4, max_length=8)


class UpdateResidentRequest(BaseModel):
    """Schema untuk request update data penghuni. Semua field bersifat opsional."""

    name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, min_length=10, max_length=20, pattern=r"^[0-9]+$")
    room_number: int | None = Field(None, gt=0)
    pin: str | None = Field(None, min_length=4, max_length=8)


class ResidentResponse(BaseModel):
    """Schema untuk response data penghuni."""

    id: UUID
    name: str
    phone: str
    room_number: int
    created_at: datetime
    updated_at: datetime


class FaceEmbeddingResponse(BaseModel):
    """Schema untuk response data vector embedding wajah."""

    id: UUID
    resident_id: UUID
    image_path: str
    embedding: list[float]
    created_at: datetime
    updated_at: datetime


class FaceEmbeddingResult(BaseModel):
    """Schema untuk hasil pemrosesan setiap file dalam bulk upload vector embedding wajah."""

    filename: str
    status: str
    image_path: str | None = None
    error: str | None = None


class BulkFaceEmbeddingResponse(BaseModel):
    """Schema untuk response hasil pemrosesan bulk upload vector embedding wajah."""

    total_processed: int
    total_success: int
    total_failed: int
    results: list[FaceEmbeddingResult]


class AccessLogResponse(BaseModel):
    """Schema untuk response data log akses."""

    id: UUID
    resident_id: UUID | None = None
    method: AccessMethodEnum
    granted: bool
    similarity: Decimal
    image_path: str | None = None
    created_at: datetime
    updated_at: datetime

    # Informasi penghuni terkait (jika tersedia)
    resident: ResidentResponse | None = None


class DashboardStatsResponse(BaseModel):
    """Schema untuk response data statistik dashboard."""

    total_residents: int
    total_access_today: int
    total_valid_access: int
    total_invalid_access: int
    access_logs: list[AccessLogResponse]


# --- Authentication schemas (Admin login) ---


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminResponse(BaseModel):
    id: UUID
    name: str
    username: str
    created_at: datetime
    updated_at: datetime


class LoginResponse(TokenResponse):
    admin: AdminResponse | None = None
