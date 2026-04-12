from pydantic import BaseModel


class PolicyHealthResponse(BaseModel):
    status: str
    evaluator: str
