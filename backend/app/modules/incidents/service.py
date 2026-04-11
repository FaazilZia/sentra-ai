import random
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.incident import Incident

from .scanner import GovernanceScanner

class IncidentService:
    @classmethod
    def trigger_scan(cls, db: Session, user_id: UUID, tenant_id: UUID):
        """
        Executes a real Deep Scan across connected data sources.
        """
        # Initialize and run the real scanner
        # In the container/deployment, sample_data is at the project root
        scanner = GovernanceScanner(target_dir="sample_data")
        findings = scanner.scan()
        
        # If no findings, we could still log a 'clean' scan or just return empty
        incidents = []
        for finding in findings:
            incident = Incident(
                tenant_id=tenant_id,
                user_id=user_id,
                agent_id=finding["agent_id"],
                severity=finding["severity"],
                action=finding["action"],
                details=finding["details"],
                prompt_excerpt=finding["prompt_excerpt"],
                response_excerpt=finding["response_excerpt"],
                status="unresolved",
                event_metadata={
                    **finding["metadata"], 
                    "scan_type": "deep_scan",
                    "timestamp": datetime.now().isoformat()
                }
            )
            db.add(incident)
            incidents.append(incident)
        
        db.commit()
        return incidents

