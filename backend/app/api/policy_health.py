from fastapi import APIRouter

from app.schemas.decision import PolicyHealthResponse

router = APIRouter()


@router.get("/policy-health", response_model=PolicyHealthResponse)
def policy_health() -> PolicyHealthResponse:
    return PolicyHealthResponse(status="ok", evaluator="python_policy_engine_placeholder")
