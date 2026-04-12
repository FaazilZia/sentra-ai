from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.enums import RoleName
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.models.user_role import UserRole


def seed_phase_one_data(db: Session) -> None:
    tenant = db.scalar(select(Tenant).where(Tenant.slug == settings.default_tenant_slug))
    if tenant is None:
        tenant = Tenant(name="Demo Tenant", slug=settings.default_tenant_slug, is_active=True)
        db.add(tenant)
        db.flush()

    roles = {role.name for role in db.scalars(select(Role)).all()}
    for role_name in RoleName:
        if role_name not in roles:
            db.add(Role(name=role_name, description=f"{role_name.value.title()} role"))
    db.flush()

    admin = db.scalar(select(User).where(User.email == settings.default_admin_email))
    if admin is None:
        admin = User(
            tenant_id=tenant.id,
            email=settings.default_admin_email,
            full_name="Demo Admin",
            password_hash=hash_password(settings.default_admin_password),
            is_active=True,
        )
        db.add(admin)
        db.flush()

    admin_role = db.scalar(select(Role).where(Role.name == RoleName.admin))
    existing_assignment = db.scalar(
        select(UserRole).where(UserRole.user_id == admin.id, UserRole.role_id == admin_role.id)
    )
    if existing_assignment is None:
        db.add(UserRole(user_id=admin.id, role_id=admin_role.id))

    db.commit()
