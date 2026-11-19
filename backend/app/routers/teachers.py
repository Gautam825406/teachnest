from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Teacher, User
from ..schemas import TeacherCreate, TeacherOut, TeacherUpdate

router = APIRouter(prefix="/teachers", tags=["teachers"])


def _get_or_404(db: Session, tenant_id: int, teacher_id: int) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant_id).first()
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


@router.get("", response_model=list[TeacherOut])
def list_teachers(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Teacher)
        .filter(Teacher.tenant_id == user.tenant_id)
        .order_by(Teacher.display_weight.desc(), Teacher.id)
        .all()
    )


@router.post("", response_model=TeacherOut, status_code=201)
def create_teacher(payload: TeacherCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    teacher = Teacher(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_404(db, user.tenant_id, teacher_id)


@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(teacher_id: int, payload: TeacherUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    teacher = _get_or_404(db, user.tenant_id, teacher_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    teacher = _get_or_404(db, user.tenant_id, teacher_id)
    db.delete(teacher)
    db.commit()
    return None
