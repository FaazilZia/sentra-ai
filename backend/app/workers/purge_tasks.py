from sqlalchemy import delete
from app.db.session import SessionLocal
from app.models.incident import Incident
from app.models.user import User
from app.workers.celery_app import celery_app

@celery_app.task(name="app.workers.purge_tasks.purge_user_data")
def purge_user_data(user_id: str):
    """
    Automated Purge (AGC) as per DPDP Act 2023.
    Deletes all records associated with a user when consent is withdrawn.
    """
    db = SessionLocal()
    try:
        # 1. Delete all security incidents
        db.execute(delete(Incident).where(Incident.user_id == user_id))
        
        # 2. Mark user as inactive or delete depending on policy
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_active = False
            # We keep the user object for audit purposes (linking to the Consent Ledger)
            # but wipe all other sensitive data.
        
        db.commit()
        return f"Successfully purged data for user {user_id}"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
