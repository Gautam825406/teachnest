from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Course, Student, User
from ..schemas import PaginatedStudents, StudentOut, mask_phone

router = APIRouter(prefix="/students", tags=["students"])


def _course_list(db: Session, tenant_id: int, course_ids: list) -> list:
    if not course_ids:
        return []
    courses = db.query(Course).filter(Course.tenant_id == tenant_id, Course.id.in_(course_ids)).all()
    by_id = {c.id: c for c in courses}
    return [{"id": cid, "title": by_id[cid].title} if cid in by_id else {"id": cid} for cid in course_ids]


def _to_out(db: Session, student: Student, include_full_phone: bool) -> StudentOut:
    return StudentOut(
        id=student.id,
        name=student.name,
        phone=student.phone if include_full_phone else None,
        masked_phone=mask_phone(student.phone),
        email=student.email,
        city=student.city,
        state=student.state,
        signup_date=student.signup_date,
        courses=_course_list(db, student.tenant_id, student.course_ids or []),
    )


@router.get("", response_model=PaginatedStudents)
def list_students(
    search: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    city: str | None = None,
    state: str | None = None,
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Student).filter(Student.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Student.name.ilike(f"%{search}%"))
    if phone:
        q = q.filter(Student.phone.ilike(f"%{phone}%"))
    if email:
        q = q.filter(Student.email.ilike(f"%{email}%"))
    if city:
        q = q.filter(Student.city.ilike(f"%{city}%"))
    if state:
        q = q.filter(Student.state.ilike(f"%{state}%"))
    if from_:
        try:
            q = q.filter(Student.signup_date >= datetime.combine(datetime.fromisoformat(from_).date(), time.min))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid 'from' date")
    if to:
        try:
            q = q.filter(Student.signup_date <= datetime.combine(datetime.fromisoformat(to).date(), time.max))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid 'to' date")
    total = q.count()
    items = q.order_by(Student.id).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [_to_out(db, s, include_full_phone=False) for s in items], "total": total}


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id, Student.tenant_id == user.tenant_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return _to_out(db, student, include_full_phone=True)
