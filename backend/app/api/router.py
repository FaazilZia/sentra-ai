from fastapi import APIRouter

from app.api.current_user import router as current_user_router
from app.api.health import router as health_router
from app.modules.auth.router import router as auth_router
from app.modules.tenants.router import router as tenant_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(current_user_router, tags=["users"])
api_router.include_router(tenant_router, tags=["tenants"])
