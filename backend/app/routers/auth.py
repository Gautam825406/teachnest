import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, user_payload
from ..models import Role, Settings, Tenant, User
from ..permissions import PERMISSIONS, TEACHER_PERMISSIONS
from ..schemas import AuthResponse, LoginRequest, SignupRequest, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def generate_org_code(db: Session, tenant_name: str) -> str:
    letters = re.sub(r"[^A-Za-z]", "", tenant_name).upper()[:4].ljust(4, "X")
    for n in range(1, 10000):
        code = f"{letters}{n:04d}"
        if not db.query(Tenant).filter(Tenant.org_code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not allocate org code")


def _auth_response(user: User, db: Session) -> AuthResponse:
    token = create_access_token(user_id=user.id, tenant_id=user.tenant_id, username=user.username)
    return AuthResponse(access_token=token, token_type="bearer", user=UserOut(**user_payload(user, db)))


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(User)
        .filter((User.username == payload.username) | (User.email == payload.email))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    org_code = generate_org_code(db, payload.tenant_name)
    tenant = Tenant(name=payload.tenant_name, org_code=org_code)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    user = User(
        tenant_id=tenant.id, username=payload.username, email=payload.email,
        password_hash=hash_password(payload.password), role="Super Admin",
    )
    db.add(user)
    db.add_all([
        Role(tenant_id=tenant.id, name="Admin", is_system_default=True, permissions=list(PERMISSIONS)),
        Role(tenant_id=tenant.id, name="Teacher", is_system_default=False, permissions=list(TEACHER_PERMISSIONS)),
    ])
    db.add(Settings(tenant_id=tenant.id, company_name=payload.tenant_name, email=payload.email))
    db.commit()
    db.refresh(user)
    return _auth_response(user, db)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Username is globally unique at signup time, so a username-only login
    # resolves unambiguously to one tenant.
    user = db.query(User).filter(User.username == payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    # Suspension is enforced at login only: existing sessions are NOT
    # revoked — JWTs are stateless and stay valid until they expire.
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if tenant is not None and tenant.suspended:
        raise HTTPException(status_code=403, detail="Institute suspended")
    return _auth_response(user, db)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserOut(**user_payload(user, db))
