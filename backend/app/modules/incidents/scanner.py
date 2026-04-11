import re
import os
from pathlib import Path
from typing import List, Dict

class GovernanceScanner:
    # Patterns for PII detection
    PATTERNS = {
        "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
        "AADHAAR": r"\b\d{4}-\d{4}-\d{4}\b",
        "CREDIT_CARD": r"\b(?:\d[ -]*?){13,16}\b",
        "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "SENTRA_API_KEY": r"sk-sentra-[a-f0-9]{16,}"
    }

    def __init__(self, target_dir: str = "sample_data"):
        # Go up from modules/incidents near backend root
        # If we are in backend/app/modules/incidents/scanner.py, sample_data is at backend/sample_data
        # We'll use absolute path or relative to project root
        self.target_dir = Path(target_dir)

    def scan(self) -> List[Dict]:
        found_incidents = []
        if not self.target_dir.exists():
            # Try to find it relative to current working directory (usually backend root)
            self.target_dir = Path(os.getcwd()) / "sample_data"
            
        if not self.target_dir.exists():
            return found_incidents

        for file_path in self.target_dir.iterdir():
            if file_path.is_file() and not file_path.name.startswith('.'):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        file_incidents = self._scan_content(content, file_path.name)
                        found_incidents.extend(file_incidents)
                except Exception as e:
                    print(f"Error scanning {file_path}: {e}")
        
        return found_incidents

    def _scan_content(self, content: str, filename: str) -> List[Dict]:
        incidents = []
        # Sort by pii_type to be deterministic
        for pii_type in sorted(self.PATTERNS.keys()):
            pattern = self.PATTERNS[pii_type]
            matches = list(re.finditer(pattern, content))
            for match in matches:
                # Get some context around the match
                start = max(0, match.start() - 50)
                end = min(len(content), match.end() + 50)
                excerpt = content[start:end].strip().replace('\n', ' ')
                
                # Assign a severity based on the type
                severity = 40
                if pii_type in ["SSN", "AADHAAR", "CREDIT_CARD", "SENTRA_API_KEY"]:
                    severity = 90
                elif pii_type == "EMAIL":
                    severity = 30
                
                incidents.append({
                    "agent_id": f"Scanner-Engine",
                    "severity": severity,
                    "action": "flagged",
                    "details": f"Sensitive {pii_type} data discovered in source: {filename}",
                    "prompt_excerpt": f"...{excerpt}...",
                    "response_excerpt": f"Policy Violation: {pii_type} found in file '{filename}' during deep scan.",
                    "metadata": {
                        "pii_type": pii_type,
                        "source": filename,
                        "location": "file_system"
                    }
                })
        return incidents
