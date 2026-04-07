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
