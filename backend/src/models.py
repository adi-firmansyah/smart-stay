from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from src.config import settings


class AccessMethodEnum(str, enum.Enum):
    FACE_RECOGNITION = "FACE_RECOGNITION"
    RFID = "RFID"
    PIN = "PIN"


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        nullable=False,
        index=True,
        default=uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Resident(Base):
    __tablename__ = "residents"

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    room_number: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
        index=True,
    )
    rfid_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )
    pin: Mapped[str] = mapped_column(
        String(8),
        unique=True,
        nullable=False,
        index=True,
    )

    # Relationships
    face_embeddings: Mapped[list[FaceEmbedding]] = relationship(
        back_populates="resident", cascade="all, delete-orphan"
    )
    access_logs: Mapped[list[AccessLog]] = relationship(back_populates="resident")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    resident_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("residents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_path: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.deepface_embedding_size), nullable=False
    )

    # Relationships
    resident: Mapped[Resident] = relationship(back_populates="face_embeddings")


class AccessLog(Base):
    __tablename__ = "access_logs"

    resident_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("residents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    method: Mapped[AccessMethodEnum] = mapped_column(
        Enum(AccessMethodEnum, name="access_method_enum"),
        nullable=False,
        index=True,
    )
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    similarity: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    suspicious_image_path: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    resident: Mapped[Resident | None] = relationship(back_populates="access_logs")


class Admin(Base):
    __tablename__ = "admins"

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    password: Mapped[str] = mapped_column(String(255), nullable=False)


class Gate(Base):
    __tablename__ = "gates"

    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
