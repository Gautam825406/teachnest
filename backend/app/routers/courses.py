from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Course, User
from ..schemas import CourseCreate, CourseOut, CourseUpdate, PaginatedCourses

router = APIRouter(prefix="/courses", tags=["courses"])


def _get_or_404(db: Session, tenant_id: int, course_id: int) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.tenant_id == tenant_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("", response_model=PaginatedCourses)
def list_courses(
    search: str | None = None,
    category_id: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Course).filter(Course.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Course.title.ilike(f"%{search}%"))
    if category_id is not None:
        q = q.filter(Course.category_id == category_id)
    total = q.count()
    items = q.order_by(Course.position, Course.id).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


@router.post("", response_model=CourseOut, status_code=201)
def create_course(payload: CourseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = Course(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_404(db, user.tenant_id, course_id)


@router.put("/{course_id}", response_model=CourseOut)
def update_course(course_id: int, payload: CourseUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_or_404(db, user.tenant_id, course_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_or_404(db, user.tenant_id, course_id)
    db.delete(course)
    db.commit()
    return None
