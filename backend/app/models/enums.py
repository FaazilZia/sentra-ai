import enum


class RoleName(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    auditor = "auditor"
    approver = "approver"
    viewer = "viewer"


class APIKeyType(str, enum.Enum):
    service = "service"
    machine = "machine"


class PolicyEffect(str, enum.Enum):
    allow = "allow"
    deny = "deny"
    mask = "mask"
    redact = "redact"
    require_approval = "require_approval"
    rate_limit = "rate_limit"


class PolicyStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
