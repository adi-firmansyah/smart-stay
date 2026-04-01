from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from reqtrace import ReqTrace, ReqTraceFilter, ReqTraceMiddleware

from src.config import settings
from src.database import check_db, close_db, init_db
from src.routers.face_embeddings import router as face_embeddings_router
from src.routers.residents import router as residents_router


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


# Konfigurasi reqtrace middleware for logging http request
if settings.app_env == "development":
    rt = ReqTrace(
        enabled=True,
        output="file",
        file_path="logs/reqtrace.json",
        diff=True,
        filters=ReqTraceFilter(
            mode="blacklist",
            routes=["/docs", "/redoc", "/openapi.json"],
        ),
    )
    app.add_middleware(ReqTraceMiddleware, config=rt.config)


@app.get("/health")
def health_check() -> dict[str, str]:
    db_ok: bool = check_db()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


# Include routers
app.include_router(residents_router)
app.include_router(face_embeddings_router)
