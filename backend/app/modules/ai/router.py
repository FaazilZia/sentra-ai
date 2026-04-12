from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func

from app.core.config import settings
from app.core.dependencies import DbSession, get_current_user, get_current_tenant
from app.models.incident import Incident
from app.models.policy import Policy
from app.models.tenant import Tenant

router = APIRouter(prefix="/ai", tags=["AI Copilot"])

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_copilot(
    chat_in: ChatRequest,
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    AI Advisory endpoint.
    Injects current dashboard context (incidents, policies) into the AI prompt.
    """
    
    # 1. Gather Context
    incident_count = db.scalar(select(func.count(Incident.id)).where(Incident.tenant_id == tenant.id))
    unresolved_count = db.scalar(select(func.count(Incident.id)).where(Incident.tenant_id == tenant.id, Incident.status == "unresolved"))
    active_policies = db.scalar(select(func.count(Policy.id)).where(Policy.tenant_id == tenant.id))
    
    context_brief = f"""
    Current Environment Status:
    - Tenant: {tenant.name}
    - Total Security Incidents: {incident_count}
    - Unresolved Risks: {unresolved_count}
    - Active Compliance Policies: {active_policies}
    """

    system_prompt = f"""
    You are 'Sentra AI Copilot', an expert AI Security & Compliance Assistant specialized in India's DPDP Act 2023.
    Your mission is to help the University DPO (Data Protection Officer) manage AI risks.
    
    CURRENT CONTEXT:
    {context_brief}
    
    GUIDELINES:
    - Be professional, advisory, and technically sharp.
    - If asked about risks, refer to the high number of unresolved incidents if applicable.
    - Always prioritize student data privacy (DPDP Section 6).
    - Keep responses concise (under 3 paragraphs).
    """

    # 2. Call OpenAI or Fallback to Mock
    if not settings.openai_api_key:
        # Mock Logic for Demo
        return {
            "response": f" [DEMO MODE: No API Key Found]\n\nI see that {tenant.name} currently has {unresolved_count} unresolved security incidents. Based on the DPDP Act 2023, I recommend immediately reviewing the PII leak incidents from the Admissions-AI agent. Would you like me to draft a stronger restriction policy for student SSNs?",
            "is_mock": True
        }

    try:
        import openai
        client = openai.OpenAI(api_key=settings.openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": chat_in.message}
            ],
            max_tokens=500
        )
        
        return {
            "response": response.choices[0].message.content,
            "is_mock": False
        }
    except Exception as e:
        return {
            "response": f"I encountered an error connecting to my neural core, but looking at your local data: you have {unresolved_count} unresolved risks that need attention.",
            "error": str(e),
            "is_mock": True
        }
