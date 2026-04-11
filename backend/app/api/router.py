from fastapi import APIRouter

from app.api.current_user import router as current_user_router
from app.api.health import router as health_router
from app.api.policy_health import router as policy_health_router
from app.modules.auth.router import router as auth_router
from app.modules.policies.router import router as policies_router
from app.modules.tenants.router import router as tenant_router
from app.modules.incidents.router import router as incidents_router
from app.modules.api_keys.router import router as api_keys_router
from app.modules.consent.router import router as consent_router
from app.modules.ai.router import router as ai_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(policy_health_router, tags=["policy-health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(current_user_router, tags=["users"])
api_router.include_router(tenant_router, tags=["tenants"])
api_router.include_router(policies_router, tags=["policies"])
api_router.include_router(incidents_router, tags=["incidents"])
api_router.include_router(api_keys_router, tags=["api-keys"])
api_router.include_router(consent_router, prefix="/consent", tags=["consent"])
api_router.include_router(ai_router, tags=["ai"])
