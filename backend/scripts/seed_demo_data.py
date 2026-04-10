import os
import sys

# Add the parent directory to sys.path so app modules can be located
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.enums import PolicyEffect, PolicyStatus
from app.models.policy import Policy
from app.models.policy_version import PolicyVersion
from app.models.tenant import Tenant
import app.db.models  # Required for SQLAlchemy relationship mapping

def create_mock_policies():
    policies_data = [
        {
            "name": "LLM Prompt Injection Defense",
            "description": "Blocks any incoming prompt containing known adversarial jailbreak patterns, ignore instructions, or system prompt extraction attempts.",
            "effect": PolicyEffect.deny,
            "priority": 1000,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["all"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 10},
                {"version": 2, "status": PolicyStatus.published, "created_ago_days": 8},
                {"version": 3, "status": PolicyStatus.published, "created_ago_days": 1},
            ]
        },
        {
            "name": "Strict PII Redaction",
            "description": "Automatically redacts SSNs, credit cards, and addresses from prompt text before passing to the base model using Presidio analyzer.",
            "effect": PolicyEffect.redact,
            "priority": 900,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["external_users"], "models": ["gpt-4", "gpt-3.5-turbo"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 14},
                {"version": 2, "status": PolicyStatus.published, "created_ago_days": 12},
            ]
        },
        {
            "name": "Financial Document Export Approval",
            "description": "Requires human-in-the-loop approval when an internal agent attempts to export generated financial summaries to external storage.",
            "effect": PolicyEffect.require_approval,
            "priority": 950,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["finance_agents"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.published, "created_ago_days": 30},
            ]
        },
        {
            "name": "Harmful Context Rejection",
            "description": "Utilizes the moderation API to block requests exhibiting hate speech, violence, or self-harm traits.",
            "effect": PolicyEffect.deny,
            "priority": 850,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["all"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.published, "created_ago_days": 45},
            ]
        },
        {
            "name": "Executive API Rate Limiting",
            "description": "Global rate limiting on expensive models to prevent budget exhaustion.",
            "effect": PolicyEffect.rate_limit,
            "priority": 600,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["all"], "models": ["claude-3-opus"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 5},
                {"version": 2, "status": PolicyStatus.published, "created_ago_days": 4},
            ]
        },
        {
            "name": "EU Data Residency Masking",
            "description": "Masks identifying user vectors if routing AI request to a non-EU inference node.",
            "effect": PolicyEffect.mask,
            "priority": 800,
            "status": PolicyStatus.draft,
            "enabled": True,
            "scope": {"actors": ["eu_citizens"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 2},
            ]
        },
        {
            "name": "Offensive Language Filter v2",
            "description": "Draft revision of the language filter including localized slurs. Currently under review by DPO.",
            "effect": PolicyEffect.deny,
            "priority": 750,
            "status": PolicyStatus.draft,
            "enabled": False,
            "scope": {"actors": ["all"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 1},
            ]
        },
        {
            "name": "Internal Analytics Telemetry Route",
            "description": "Tags request metadata and forwards to data lake for internal KPI dashboards.",
            "effect": PolicyEffect.allow,
            "priority": 100,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["internal_employees"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.published, "created_ago_days": 60},
            ]
        },
        {
            "name": "Source Code Exfiltration Blocker",
            "description": "Detects high-density recognizable proprietary code snippets in user output and blocks the response.",
            "effect": PolicyEffect.deny,
            "priority": 980,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["contractors"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 25},
                {"version": 2, "status": PolicyStatus.draft, "created_ago_days": 22},
                {"version": 3, "status": PolicyStatus.published, "created_ago_days": 20},
            ]
        },
        {
            "name": "Healthcare PHI Scrubbing",
            "description": "Strict redaction of medical conditions and personal health indicators before sending context to LLMs.",
            "effect": PolicyEffect.redact,
            "priority": 990,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["clinicians", "patients"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.published, "created_ago_days": 100},
            ]
        },
        {
            "name": "Competitor Trademark Masking",
            "description": "Dynamically masks mentions of competitor trademarks in marketing-agent outputs to avoid liability.",
            "effect": PolicyEffect.mask,
            "priority": 500,
            "status": PolicyStatus.published,
            "enabled": True,
            "scope": {"actors": ["marketing_agents"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.draft, "created_ago_days": 7},
                {"version": 2, "status": PolicyStatus.published, "created_ago_days": 6},
            ]
        },
        {
            "name": "Third-Party Agent Purchase Authority",
            "description": "Any AI agent action attempting to call the /purchase API requires explicit human approval.",
            "effect": PolicyEffect.require_approval,
            "priority": 1000,
            "status": PolicyStatus.published,
            "enabled": False,
            "scope": {"actors": ["shopping_agent"], "models": ["all"]},
            "versions": [
                {"version": 1, "status": PolicyStatus.published, "created_ago_days": 15},
            ]
        }
    ]

    with SessionLocal() as db:
        # Get demo tenant
        tenant = db.scalar(select(Tenant).where(Tenant.slug == settings.default_tenant_slug))
        if not tenant:
            print("❌ Demo tenant not found! Have you run backend startup sequence?")
            return

        print(f"✅ Found Tenant: {tenant.name} ({tenant.id})")

        # Cleanup existing data
        db.query(PolicyVersion).delete()
        db.query(Policy).delete()
        db.commit()
        print("✅ Cleaned up old policies.")

        for p_data in policies_data:
            # Create Policy
            policy = Policy(
                tenant_id=tenant.id,
                name=p_data["name"],
                description=p_data["description"],
                enabled=p_data["enabled"],
                priority=p_data["priority"],
                effect=p_data["effect"],
                status=p_data["status"],
                current_version=len(p_data["versions"]),
                published_version=len(p_data["versions"]) if p_data["status"] == PolicyStatus.published else None
            )
            db.add(policy)
            db.flush()

            # Create Audit Log Versions representing history
            now = datetime.utcnow()
            for v_data in p_data["versions"]:
                # Backdate creation date
                created_at = now - timedelta(days=v_data["created_ago_days"])
                
                pv = PolicyVersion(
                    policy_id=policy.id,
                    tenant_id=tenant.id,
                    version=v_data["version"],
                    name=p_data["name"],
                    description=p_data["description"],
                    enabled=p_data["enabled"],
                    priority=p_data["priority"],
                    effect=p_data["effect"],
                    status=v_data["status"],
                    is_published_snapshot=(v_data["status"] == PolicyStatus.published)
                )
                db.add(pv)
                # Override timestamp after add
                pv.created_at = created_at
            
            db.commit()
            print(f"✅ Injected Policy: {policy.name}")

if __name__ == "__main__":
    try:
        create_mock_policies()
        print("🎉 SUCCESS! Seeded realistic governance metrics.")
    except Exception as e:
        print(f"❌ Error seeding data: {str(e)}")
