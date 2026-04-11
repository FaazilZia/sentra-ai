import re
import os
import logging
from pathlib import Path
from typing import List, Dict
from sqlalchemy import create_engine, inspect, text
from .ai_brain import AIBrainService

logger = logging.getLogger(__name__)

class BaseConnector:
    def scan(self) -> List[Dict]:
        raise NotImplementedError

class FileConnector(BaseConnector):
    def __init__(self, target_dir: str, ai_brain: AIBrainService):
        self.target_dir = Path(target_dir)
        self.ai_brain = ai_brain

    def scan(self) -> List[Dict]:
        incidents = []
        if not self.target_dir.exists():
            return incidents

        for file_path in self.target_dir.iterdir():
            if file_path.is_file() and not file_path.name.startswith('.'):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Static PII Patterns
                        patterns = {
                            "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
                            "AADHAAR": r"\b\d{4}-\d{4}-\d{4}\b",
                            "CREDIT_CARD": r"\b(?:\d[ -]*?){13,16}\b",
                            "SENTRA_API_KEY": r"sk-sentra-[a-f0-9]{16,}"
                        }
                        
                        for pii_type, pattern in patterns.items():
                            for match in re.finditer(pattern, content):
                                incidents.append({
                                    "agent_id": "File-Scanner",
                                    "severity": 90 if pii_type != "EMAIL" else 30,
                                    "action": "flagged",
                                    "details": f"Sensitive {pii_type} found in {file_path.name}",
                                    "prompt_excerpt": f"Source: {file_path.name}",
                                    "response_excerpt": f"Violation in file content.",
                                    "metadata": {"pii_type": pii_type, "source": file_path.name}
                                })
                        
                        # AI Brain analysis for behavioral logs
                        if file_path.suffix in ['.txt', '.log']:
                            ai_risks = self.ai_brain.analyze_behavior(content)
                            for risk in ai_risks:
                                incidents.append({
                                    "agent_id": "AI-Brain",
                                    "severity": risk.get("severity", 50),
                                    "action": "flagged",
                                    "details": f"✨ {risk['type'].capitalize()}: {risk['reason']}",
                                    "prompt_excerpt": f"Source: {file_path.name}",
                                    "response_excerpt": risk['reason'],
                                    "metadata": {"pii_type": "AI_BRAIN_INSIGHT", "source": file_path.name, "ai_insight": True}
                                })
                except Exception as e:
                    logger.error(f"File Scan Error: {e}")
        return incidents

class SQLConnector(BaseConnector):
    def __init__(self, connection_url: str, ai_brain: AIBrainService, name: str = "SQL-DB"):
        self.connection_url = connection_url
        self.ai_brain = ai_brain
        self.name = name

    def scan(self) -> List[Dict]:
        incidents = []
        try:
            # Use a quick introspective engine
            engine = create_engine(self.connection_url)
            inspector = inspect(engine)
            with engine.connect() as conn:
                for table_name in inspector.get_table_names():
                    # We'll scan a sample of rows from each table for PII
                    # Limit to 5 rows for demo speed
                    result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT 5"))
                    rows = result.fetchall()
                    for row in rows:
                        row_str = " ".join([str(val) for val in row])
                        # Check for patterns in the row content
                        if re.search(r"\b\d{4}-\d{4}-\d{4}\b", row_str):
                            incidents.append({
                                "agent_id": self.name,
                                "severity": 90,
                                "action": "flagged",
                                "details": f"PII (Aadhaar) detected in database table: {table_name}",
                                "prompt_excerpt": f"Table: {table_name}",
                                "response_excerpt": f"Row Sample: {row_str[:100]}...",
                                "metadata": {"pii_type": "AADHAAR", "source": f"{self.name}.{table_name}"}
                            })
        except Exception as e:
            logger.error(f"SQL Scan Error for {self.name}: {e}")
        return incidents

class GovernanceScanner:
    def __init__(self, db_session=None):
        self.ai_brain = AIBrainService()
        self.connectors: List[BaseConnector] = []
        
        # 1. Always add Local Files connector
        self.connectors.append(FileConnector("sample_data", self.ai_brain))
        
        # 2. In production, we'd load others from the DB
        # For demo, we'll try to scan our own DB if we have access
        from app.core.config import settings
        if settings.database_url:
            self.connectors.append(SQLConnector(settings.database_url, self.ai_brain, name="Production-Postgres"))

    def scan(self) -> List[Dict]:
        all_findings = []
        for connector in self.connectors:
            findings = connector.scan()
            all_findings.extend(findings)
        return all_findings
