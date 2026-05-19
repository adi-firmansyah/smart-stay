from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select

from utils import create_access_token, get_current_admin, verify_password
from database import DBSession
from models import Admin
from schemas import LoginRequest, LoginResponse, AdminResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
async def admin_login(db: DBSession, payload: LoginRequest) -> LoginResponse:
    stmt = select(Admin).where(Admin.username == payload.username)
    admin = db.execute(stmt).scalar_one_or_none()

    if not admin or not verify_password(payload.password, admin.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah.",
        )

    token = create_access_token(str(admin.id))

    admin_data = AdminResponse(
        id=admin.id,
        name=admin.name,
        username=admin.username,
        created_at=admin.created_at,
        updated_at=admin.updated_at,
    )

    return LoginResponse(access_token=token, token_type="bearer", admin=admin_data)


@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(
    current_admin: Admin = Depends(get_current_admin),
) -> Admin:
    """Endpoint untuk mendapatkan informasi admin yang sedang login."""
    return current_admin
