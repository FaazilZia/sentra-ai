import hashlib
import json
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.consent import ConsentRecord

class ConsentService:
    @staticmethod
    def _calculate_hash(user_id: str, action: str, version: str, prev_hash: str, metadata: dict) -> str:
        # Create a deterministic string for hashing
        payload = {
            "user_id": user_id,
            "action": action,
            "version": version,
            "prev_hash": prev_hash,
            "metadata": metadata
        }
        encoded = json.dumps(payload, sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()

    @classmethod
    def get_last_hash(cls, db: Session, user_id: UUID) -> str:
        stmt = (
            select(ConsentRecord.hashing_chain)
            .where(ConsentRecord.user_id == user_id)
            .order_by(ConsentRecord.created_at.desc())
            .limit(1)
        )
        result = db.execute(stmt).scalar_one_or_none()
        return result or "0" * 64  # Initial hash for the first record

    @classmethod
    def record_consent(
        cls, 
        db: Session, 
        user_id: UUID, 
        action: str, 
        version: str = "1.0", 
        meta: dict = None
    ) -> ConsentRecord:
        meta = meta or {}
        prev_hash = cls.get_last_hash(db, user_id)
        
        current_hash = cls._calculate_hash(
            str(user_id), 
            action, 
            version, 
            prev_hash, 
            meta
        )
        
        record = ConsentRecord(
            user_id=user_id,
            action=action,
            notice_version=version,
            hashing_chain=current_hash,
            metadata_json=meta
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
