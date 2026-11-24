"""Platform (Super Admin) panel API.

Env-configured platform admin only (see platform_auth.py) — every
endpoint except POST /api/platform/auth/login requires a platform-admin
JWT (deps.get_platform_admin). Tenant-admin and student tokens are
rejected with 401.

Covers: platform stats, institute onboarding/listing/suspension,
subscription plans + per-institute subscriptions, and per-institute
Cashfree status (masked only — full keys are never returned).
"""
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_platform_admin
from ..models import (
    Course,
    Order,
    Role,
    Settings,
    Student,
    SubscriptionPlan,
    Tenant,
    TenantSubscription,
    User,
)
from ..permissions import PERMISSIONS, TEACHER_PERMISSIONS
from ..platform_auth import check_platform_credentials, platform_admin_configured
from ..schemas import _email_is_plausible
from ..security import create_platform_token, hash_password
from ..tenant_cashfree import tenant_cashfree_status
from .auth import generate_org_code

router = APIRouter(prefix="/platform", tags=["platform-admin"])

# Default plans seeded lazily on first plans read, ONLY when the table is
# empty. These are the only prices invented anywhere in this module —
# placeholders the platform admin can edit from the panel.
DEFAULT_PLANS = [
    {
        "name": "Starter",
        "monthly_price_inr": 0.0,
        "yearly_price_inr": 0.0,
        "features": ["Up to 100 students", "Courses & test series"],
    },
    {
        "name": "Growth",
        "monthly_price_inr": 999.0,
        "yearly_price_inr": 9999.0,
        "features": ["Unlimited students", "Live classes", "AI question generator"],
    },
]

VALID_CYCLES = ("monthly", "yearly")
VALID_SUBSCRIPTION_STATUSES = ("trial", "active", "past_due", "cancelled")


# ---------- Request bodies ----------
class PlatformLoginIn(BaseModel):
    username: str
    password: str


class InstituteCreateIn(BaseModel):
    institute_name: str
    admin_name: str
    admin_username: str
    email: str
    phone: str = ""
    password: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return _email_is_plausible(v)


class InstituteStatusIn(BaseModel):
    suspended: bool


class PlanIn(BaseModel):
    name: str | None = None
    monthly_price_inr: float | None = None
    yearly_price_inr: float | None = None
    features: list[str] | None = None
    active: bool | None = None


class SubscriptionIn(BaseModel):
    plan_id: int
    billing_cycle: str = "monthly"
    status: str = "active"


# ---------- Serialisers ----------
def _plan_out(plan: SubscriptionPlan) -> dict:
    try:
        features = json.loads(plan.features or "[]")
    except (ValueError, TypeError):
        features = []
    return {
        "id": plan.id,
        "name": plan.name,
        "monthly_price_inr": plan.monthly_price_inr,
        "yearly_price_inr": plan.yearly_price_inr,
        "features": features if isinstance(features, list) else [],
        "active": plan.active,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }


def _subscription_out(sub: TenantSubscription | None, db: Session) -> dict | None:
    if sub is None:
        return None
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    return {
        "id": sub.id,
        "tenant_id": sub.tenant_id,
        "plan_id": sub.plan_id,
        "plan_name": plan.name if plan else None,
        "billing_cycle": sub.billing_cycle,
        "status": sub.status,
        "started_at": sub.started_at.isoformat() if sub.started_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
    }


def _institute_counts(db: Session, tenant_id: int) -> dict:
    return {
        "users": db.query(func.count(User.id)).filter(User.tenant_id == tenant_id).scalar() or 0,
        "students": db.query(func.count(Student.id)).filter(Student.tenant_id == tenant_id).scalar() or 0,
        "courses": db.query(func.count(Course.id)).filter(Course.tenant_id == tenant_id).scalar() or 0,
        "orders": db.query(func.count(Order.id)).filter(Order.tenant_id == tenant_id).scalar() or 0,
    }


def _institute_out(db: Session, tenant: Tenant, detail: bool = False) -> dict:
    sub = (
        db.query(TenantSubscription)
        .filter(TenantSubscription.tenant_id == tenant.id)
        .first()
    )
    out = {
        "id": tenant.id,
        "name": tenant.name,
        "org_code": tenant.org_code,
        "suspended": bool(tenant.suspended),
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        "counts": _institute_counts(db, tenant.id),
        "subscription": _subscription_out(sub, db),
        "cashfree": tenant_cashfree_status(db, tenant.id),
    }
    if detail:
        out["admins"] = [
            {"id": u.id, "username": u.username, "email": u.email, "role": u.role}
            for u in db.query(User).filter(User.tenant_id == tenant.id).order_by(User.id).all()
        ]
    return out


def _seed_default_plans(db: Session) -> None:
    """Seed the two default plans, ONLY when the plans table is empty."""
    if db.query(func.count(SubscriptionPlan.id)).scalar():
        return
    for p in DEFAULT_PLANS:
        db.add(SubscriptionPlan(
            name=p["name"],
            monthly_price_inr=p["monthly_price_inr"],
            yearly_price_inr=p["yearly_price_inr"],
            features=json.dumps(p["features"]),
            active=True,
        ))
    db.commit()


def _get_institute_or_404(db: Session, institute_id: int) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == institute_id).first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Institute not found")
    return tenant


def _get_plan_or_404(db: Session, plan_id: int) -> SubscriptionPlan:
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


# ---------- 1. Platform auth ----------
@router.post("/auth/login")
def platform_login(payload: PlatformLoginIn):
    if not platform_admin_configured():
        raise HTTPException(status_code=503, detail="Platform admin not configured")
    if not check_platform_credentials(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="Invalid platform admin credentials")
    return {
        "access_token": create_platform_token(username=payload.username),
        "token_type": "bearer",
    }


# ---------- 2. Stats ----------
@router.get("/stats")
def platform_stats(_admin: dict = Depends(get_platform_admin), db: Session = Depends(get_db)):
    # Revenue counts only what the codebase actually marks as paid on an
    # Order row: status "SUCCESS" (created by grant_enrolment on a PAID
    # PaymentTransaction). "PAID" is a PaymentTransaction status, never an
    # Order status, so it must not be counted here.
    revenue = (
        db.query(func.coalesce(func.sum(Order.amount), 0.0))
        .filter(Order.status == "SUCCESS")
        .scalar()
        or 0.0
    )
    return {
        "institutes": db.query(func.count(Tenant.id)).scalar() or 0,
        "active_subscriptions": db.query(func.count(TenantSubscription.id)).filter(
            TenantSubscription.status == "active"
        ).scalar() or 0,
        "students": db.query(func.count(Student.id)).scalar() or 0,
        "orders": db.query(func.count(Order.id)).scalar() or 0,
        "total_revenue": float(revenue),
    }


# ---------- 3. Institutes ----------
@router.get("/institutes")
def list_institutes(
    q: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Tenant)
    if q:
        like = f"%{q}%"
        query = query.filter((Tenant.name.ilike(like)) | (Tenant.org_code.ilike(like)))
    total = query.count()
    tenants = query.order_by(Tenant.id).offset(skip).limit(limit).all()
    return {
        "items": [_institute_out(db, t) for t in tenants],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/institutes", status_code=201)
def create_institute(
    payload: InstituteCreateIn,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    if not (payload.institute_name or "").strip():
        raise HTTPException(status_code=400, detail="institute_name is required")
    if not (payload.admin_name or "").strip():
        raise HTTPException(status_code=400, detail="admin_name is required")
    if len(payload.admin_username or "") < 3:
        raise HTTPException(status_code=400, detail="admin_username must be at least 3 characters")
    if len(payload.password or "") < 6:
        raise HTTPException(status_code=400, detail="password must be at least 6 characters")
    # Tenant-admin login resolves a username globally (routers/auth.py
    # login looks up User by username alone), and signup enforces the
    # same global uniqueness — so a platform-created admin username/email
    # must also be globally unique, not just within the new tenant.
    existing = (
        db.query(User)
        .filter((User.username == payload.admin_username) | (User.email == payload.email))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    org_code = generate_org_code(db, payload.institute_name)
    tenant = Tenant(name=payload.institute_name.strip(), org_code=org_code)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    user = User(
        tenant_id=tenant.id,
        username=payload.admin_username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="Super Admin",
    )
    db.add(user)
    # Same baseline as self-signup: default roles + settings, so the new
    # institute works immediately. The contact phone lives on Settings
    # (there is no phone column on User).
    db.add_all([
        Role(tenant_id=tenant.id, name="Admin", is_system_default=True, permissions=list(PERMISSIONS)),
        Role(tenant_id=tenant.id, name="Teacher", is_system_default=False, permissions=list(TEACHER_PERMISSIONS)),
    ])
    db.add(Settings(
        tenant_id=tenant.id,
        company_name=payload.institute_name.strip(),
        email=payload.email,
        phone=payload.phone or "",
    ))
    db.commit()
    db.refresh(user)
    # NOTE: User has no display-name column, so admin_name is accepted for
    # the onboarding form and echoed here but is not persisted anywhere.
    return {
        "tenant_id": tenant.id,
        "institute_name": tenant.name,
        "org_code": tenant.org_code,
        "admin_username": user.username,
        "admin_name": payload.admin_name,
        "email": user.email,
    }


@router.get("/institutes/{institute_id}")
def get_institute(
    institute_id: int,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    return _institute_out(db, _get_institute_or_404(db, institute_id), detail=True)


@router.patch("/institutes/{institute_id}/status")
def set_institute_status(
    institute_id: int,
    payload: InstituteStatusIn,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    tenant = _get_institute_or_404(db, institute_id)
    tenant.suspended = bool(payload.suspended)
    db.commit()
    db.refresh(tenant)
    return {"id": tenant.id, "org_code": tenant.org_code, "suspended": bool(tenant.suspended)}


# ---------- 4. Plans ----------
@router.get("/plans")
def list_plans(_admin: dict = Depends(get_platform_admin), db: Session = Depends(get_db)):
    _seed_default_plans(db)
    plans = db.query(SubscriptionPlan).order_by(SubscriptionPlan.id).all()
    return {"plans": [_plan_out(p) for p in plans]}


@router.post("/plans", status_code=201)
def create_plan(
    payload: PlanIn,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    if not (payload.name or "").strip():
        raise HTTPException(status_code=400, detail="name is required")
    if (payload.monthly_price_inr is None or payload.monthly_price_inr < 0) or (
        payload.yearly_price_inr is None or payload.yearly_price_inr < 0
    ):
        raise HTTPException(status_code=400, detail="monthly_price_inr and yearly_price_inr must be >= 0")
    plan = SubscriptionPlan(
        name=payload.name.strip(),
        monthly_price_inr=payload.monthly_price_inr,
        yearly_price_inr=payload.yearly_price_inr,
        features=json.dumps(payload.features or []),
        active=True,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_out(plan)


@router.patch("/plans/{plan_id}")
def update_plan(
    plan_id: int,
    payload: PlanIn,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    plan = _get_plan_or_404(db, plan_id)
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="name must not be empty")
        plan.name = payload.name.strip()
    if payload.monthly_price_inr is not None:
        if payload.monthly_price_inr < 0:
            raise HTTPException(status_code=400, detail="monthly_price_inr must be >= 0")
        plan.monthly_price_inr = payload.monthly_price_inr
    if payload.yearly_price_inr is not None:
        if payload.yearly_price_inr < 0:
            raise HTTPException(status_code=400, detail="yearly_price_inr must be >= 0")
        plan.yearly_price_inr = payload.yearly_price_inr
    if payload.features is not None:
        plan.features = json.dumps(payload.features)
    if payload.active is not None:
        plan.active = bool(payload.active)
    db.commit()
    db.refresh(plan)
    return _plan_out(plan)


@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: int,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    plan = _get_plan_or_404(db, plan_id)
    has_subscriptions = (
        db.query(TenantSubscription).filter(TenantSubscription.plan_id == plan.id).first() is not None
    )
    if has_subscriptions:
        raise HTTPException(
            status_code=400,
            detail="Plan has subscriptions and cannot be deleted",
        )
    # Soft-delete only: the row stays for history, active=False hides it.
    plan.active = False
    db.commit()
    db.refresh(plan)
    return _plan_out(plan)


# ---------- 5. Per-institute subscription ----------
@router.post("/institutes/{institute_id}/subscription", status_code=201)
def assign_subscription(
    institute_id: int,
    payload: SubscriptionIn,
    _admin: dict = Depends(get_platform_admin),
    db: Session = Depends(get_db),
):
    tenant = _get_institute_or_404(db, institute_id)
    if payload.billing_cycle not in VALID_CYCLES:
        raise HTTPException(status_code=400, detail="billing_cycle must be monthly|yearly")
    if payload.status not in VALID_SUBSCRIPTION_STATUSES:
        raise HTTPException(status_code=400, detail="status must be trial|active|past_due|cancelled")
    plan = _get_plan_or_404(db, payload.plan_id)
    if not plan.active:
        raise HTTPException(status_code=400, detail="Plan is not active")
    now = datetime.utcnow()
    days = 30 if payload.billing_cycle == "monthly" else 365
    sub = (
        db.query(TenantSubscription)
        .filter(TenantSubscription.tenant_id == tenant.id)
        .first()
    )
    if sub is None:
        sub = TenantSubscription(tenant_id=tenant.id, plan_id=plan.id)
        db.add(sub)
    sub.plan_id = plan.id
    sub.billing_cycle = payload.billing_cycle
    sub.status = payload.status
    sub.started_at = now
    sub.ends_at = now + timedelta(days=days)
    db.commit()
    db.refresh(sub)
    return _subscription_out(sub, db)
