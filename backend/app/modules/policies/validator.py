from app.schemas.policy import PolicyCreate, PolicyUpdate


class PolicyValidator:
    @staticmethod
    def validate_create(payload: PolicyCreate) -> PolicyCreate:
        return payload

    @staticmethod
    def validate_update(payload: PolicyUpdate) -> PolicyUpdate:
        return payload
