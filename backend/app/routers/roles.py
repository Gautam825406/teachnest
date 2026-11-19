from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Role, User
from ..schemas import RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


def _get_or_404(db: Session, tenant_id: int, role_id: int) -> Role:
    role = db.query(Role).filter(Role.id == role_id, Role.tenant_id == tenant_id).first()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.get("", response_model=list[RoleOut])
def list_roles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Role).filter(Role.tenant_id == user.tenant_id).order_by(Role.id).all()


@router.post("", response_model=RoleOut, status_code=201)
def create_role(payload: RoleCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = Role(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/{role_id}", response_model=RoleOut)
def get_role(role_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_404(db, user.tenant_id, role_id)


@router.put("/{role_id}", response_model=RoleOut)
def update_role(role_id: int, payload: RoleUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = _get_or_404(db, user.tenant_id, role_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(role, field, value)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/{role_id}", status_code=204)
def delete_role(role_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = _get_or_404(db, user.tenant_id, role_id)
    db.delete(role)
    db.commit()
    return None
