import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.config import settings
from src.database import check_db, close_db, init_db
from src.routers.access_logs import router as access_logs_router
from src.routers.dashboard import router as dashboard_router
from src.routers.face_embeddings import router as face_embeddings_router
from src.routers.residents import router as residents_router
from src.routers.verification import router as verification_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield
    close_db()


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Set up static file serving for uploaded images
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

logfire.configure()
logfire.instrument_fastapi(app)


@app.get("/health")
async def health_check() -> dict[str, str]:
    db_ok: bool = check_db()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


# Include routers
app.include_router(residents_router)
app.include_router(face_embeddings_router)
app.include_router(access_logs_router)
app.include_router(verification_router)
app.include_router(dashboard_router)
