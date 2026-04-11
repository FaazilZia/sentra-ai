from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.modules.consent.service import ConsentService
from app.workers.purge_tasks import purge_user_data

router = APIRouter()

@router.post("/grant")
async def grant_consent(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Records a new Grant of Consent in the immutable ledger.
    """
    metadata = {
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
    }
    
    record = ConsentService.record_consent(
        db, 
        user_id=current_user.id, 
        action="GRANT", 
        meta=metadata
    )
    
    return {"status": "success", "record_id": str(record.id), "hash": record.hashing_chain}

@router.post("/withdraw")
async def withdraw_consent(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Records Withdrawal of Consent and triggers the automated data purge.
    """
    metadata = {
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
    }
    
    # 1. Record the withdrawal in the ledger (Permanent proof)
    record = ConsentService.record_consent(
        db, 
        user_id=current_user.id, 
        action="WITHDRAW", 
        meta=metadata
    )
    
    # 2. Trigger the asynchronous purge task (The "Auto-Delete")
    purge_user_data.delay(str(current_user.id))
    
    return {
        "status": "success", 
        "message": "Consent withdrawn. Automated data purge initiated.",
        "record_id": str(record.id)
    }

@router.get("/history")
async def get_consent_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the student's audit trail of consent events.
    """
    from sqlalchemy import select
    from app.models.consent import ConsentRecord
    
    stmt = select(ConsentRecord).where(ConsentRecord.user_id == current_user.id).order_by(ConsentRecord.created_at.desc())
    records = db.execute(stmt).scalars().all()
    
    return [
        {
            "id": str(r.id),
            "action": r.action,
            "timestamp": r.created_at,
            "version": r.notice_version,
            "hash": r.hashing_chain
        }
        for r in records
    ]
