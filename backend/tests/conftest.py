"""Pytest configuration dan fixtures untuk testing Smart Stay backend."""

from typing import Generator

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_session
from models import Admin


# Gunakan in-memory SQLite database untuk testing
@pytest.fixture(scope="session")
def test_database_url():
    """Mendapatkan URL database untuk testing."""
    return "sqlite:///:memory:"


@pytest.fixture
def engine(test_database_url):
    """Membuat engine SQLAlchemy untuk testing."""
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign keys untuk SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def SessionLocal(engine):
    """Membuat SessionLocal untuk testing."""
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session(SessionLocal) -> Generator[Session, None, None]:
    """Fixture untuk database session per test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()  # Rollback any uncommitted changes
        session.close()


@pytest.fixture
def client(db_session):
    """Membuat test client FastAPI."""
    from fastapi.testclient import TestClient

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_session] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def setup_admin(db_session: Session):
    """Membuat admin untuk testing."""
    from utils import hash_password

    admin = Admin(
        name="Admin Test",
        username="admin_test",
        password=hash_password("password123"),
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def admin_token(client, setup_admin):
    """Mendapatkan token JWT untuk admin."""
    response = client.post(
        "/auth/login",
        json={
            "username": "admin_test",
            "password": "password123",
        },
    )
    return response.json()["access_token"]


@pytest.fixture(autouse=True)
def mock_face_embedding_extraction(monkeypatch):
    """Gunakan embedding dummy agar test face embedding deterministik."""
    from config import settings
    import routers.face_embeddings as face_embeddings_router
    import utils as utils

    dummy_embedding = [0.1] * settings.deepface_embedding_size

    monkeypatch.setattr(
        face_embeddings_router, "extract_embedding", lambda image_data: dummy_embedding
    )
    monkeypatch.setattr(utils, "extract_embedding", lambda image_data: dummy_embedding)


@pytest.fixture
def auth_headers(admin_token):
    """Mendapatkan headers dengan authentication token."""
    return {"Authorization": f"Bearer {admin_token}"}
