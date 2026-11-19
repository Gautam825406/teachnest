from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Settings, User
from ..schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create(db: Session, tenant_id: int) -> Settings:
    settings = db.query(Settings).filter(Settings.tenant_id == tenant_id).first()
    if settings is None:
        settings = Settings(tenant_id=tenant_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsOut)
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_create(db, user.tenant_id)


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = _get_or_create(db, user.tenant_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
