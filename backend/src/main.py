from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import logfire
from config import settings
from database import check_db, close_db, init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers.access_logs import router as access_logs_router
from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.face_embeddings import router as face_embeddings_router
from routers.gate import router as gate_router
from routers.residents import router as residents_router
from routers.verification import router as verification_router
from routers.ws_router import router as ws_router
from utils import warmup_deepface_model


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    warmup_deepface_model()
    yield
    close_db()


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

logfire.configure()
logfire.instrument_fastapi(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Set up static file serving for uploaded images
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
async def health_check() -> dict[str, str]:
    db_ok: bool = check_db()
    return {"status": "ok" if db_ok else "error"}


# Include routers
app.include_router(residents_router)
app.include_router(face_embeddings_router)
app.include_router(access_logs_router)
app.include_router(verification_router)
app.include_router(gate_router)
app.include_router(dashboard_router)
app.include_router(auth_router)
app.include_router(ws_router)
