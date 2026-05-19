from typing import Annotated, Generator

from fastapi import Depends
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from models import Base

engine: Engine = create_engine(
    url=settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # Mencegah error saat akses atribut setelah commit
)


def get_session() -> Generator[Session, None, None]:
    """
    Mengelola lifecycle session.
    Context manager otomatis menangani penutupan session.
    """
    with SessionLocal() as session:
        yield session


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def close_db() -> None:
    engine.dispose()


def check_db() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        return True
    except Exception:
        return False


DBSession = Annotated[Session, Depends(get_session)]
