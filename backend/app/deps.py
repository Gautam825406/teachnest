from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from .database import get_db
from .models import Student, Tenant, User
from .security import decode_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload.get("sub"))
        tenant_id = int(payload.get("tenant_id"))
    except (JWTError, TypeError, ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


def get_current_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Student:
    """Student auth (Phase 3): JWT with sub == "student:<id>", role "student".

    Admin (User) tokens have a numeric sub and no "student" role, so they
    are rejected here with 401.
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        sub = payload.get("sub", "")
        if not isinstance(sub, str) or not sub.startswith("student:"):
            raise ValueError("not a student token")
        student_id = int(sub.split(":", 1)[1])
        tenant_id = int(payload.get("tenant_id"))
        if payload.get("role") != "student":
            raise ValueError("not a student token")
    except (JWTError, TypeError, ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.tenant_id == tenant_id)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return student


def get_platform_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """Platform-admin auth: JWT with sub == "platform_admin" and role ==
    "platform_admin" (see security.create_platform_token).

    Tenant-admin tokens (numeric sub) and student tokens (sub
    "student:<id>", role "student") are rejected with 401.
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("sub") != "platform_admin" or payload.get("role") != "platform_admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def get_tenant(db: Session, tenant_id: int) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def user_payload(user: User, db: Session) -> dict:
    tenant = get_tenant(db, user.tenant_id)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "tenant_name": tenant.name,
        "org_code": tenant.org_code,
    }
