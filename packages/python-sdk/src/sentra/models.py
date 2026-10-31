"""Data models for Sentra AI SDK requests and responses."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ActionRequest:
    """Request object passed to SentraClient.check_action."""

    agent: str
    action: str
    metadata: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert ActionRequest to a dictionary."""
        d: dict[str, Any] = {
            "agent": self.agent,
            "action": self.action,
        }
        if self.metadata is not None:
            d["metadata"] = self.metadata
        return d

    def __getitem__(self, key: str) -> Any:
        if key == "agent":
            return self.agent
        if key == "action":
            return self.action
        if key == "metadata":
            return self.metadata
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default


@dataclass
class ActionResponse:
    """Decision response returned by SentraClient.check_action."""

    status: str  # 'allowed' | 'blocked' | 'flagged' | 'rate_limited'
    is_allowed: bool
    risk: str  # 'low' | 'medium' | 'high'
    reason: str
    impact: str
    compliance: list[str] = field(default_factory=list)
    explanation: str | None = None
    confidence: float | None = None
    is_pending_approval: bool | None = None

    def __getattr__(self, name: str) -> Any:
        if name == "isAllowed":
            return self.is_allowed
        if name == "isPendingApproval":
            return self.is_pending_approval
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    def __getitem__(self, key: str) -> Any:
        mapping = {
            "status": self.status,
            "is_allowed": self.is_allowed,
            "isAllowed": self.is_allowed,
            "risk": self.risk,
            "reason": self.reason,
            "impact": self.impact,
            "compliance": self.compliance,
            "explanation": self.explanation,
            "confidence": self.confidence,
            "is_pending_approval": self.is_pending_approval,
            "isPendingApproval": self.is_pending_approval,
        }
        if key in mapping:
            return mapping[key]
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        """Safe dictionary-style lookup."""
        try:
            return self[key]
        except KeyError:
            return default

    def to_dict(self) -> dict[str, Any]:
        """Serializes the response to a dictionary compatible with Node SDK JSON."""
        d: dict[str, Any] = {
            "status": self.status,
            "isAllowed": self.is_allowed,
            "is_allowed": self.is_allowed,
            "risk": self.risk,
            "reason": self.reason,
            "impact": self.impact,
            "compliance": self.compliance,
        }
        if self.explanation is not None:
            d["explanation"] = self.explanation
        if self.confidence is not None:
            d["confidence"] = self.confidence
        if self.is_pending_approval is not None:
            d["isPendingApproval"] = self.is_pending_approval
            d["is_pending_approval"] = self.is_pending_approval
        return d

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, ActionResponse):
            return (
                self.status == other.status
                and self.is_allowed == other.is_allowed
                and self.risk == other.risk
                and self.reason == other.reason
                and self.impact == other.impact
                and self.compliance == other.compliance
                and self.explanation == other.explanation
                and self.confidence == other.confidence
                and self.is_pending_approval == other.is_pending_approval
            )
        if isinstance(other, dict):
            is_allowed = other.get("is_allowed") if "is_allowed" in other else other.get("isAllowed")
            is_pending = (
                other.get("is_pending_approval")
                if "is_pending_approval" in other
                else other.get("isPendingApproval")
            )
            return (
                self.status == other.get("status")
                and self.is_allowed == is_allowed
                and self.risk == other.get("risk")
                and self.reason == other.get("reason")
                and self.impact == other.get("impact")
                and self.compliance == other.get("compliance", [])
                and self.explanation == other.get("explanation")
                and (
                    self.confidence == other.get("confidence")
                    or (self.confidence is None and other.get("confidence") is None)
                )
                and (
                    self.is_pending_approval == is_pending
                    or (self.is_pending_approval is None and is_pending is None)
                )
            )
        return False
