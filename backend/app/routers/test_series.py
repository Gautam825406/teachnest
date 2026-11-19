"""Test Series + Questions (Phase 2 #2). Also logs a CourseLog on create (#23)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..course_log import log_course_event
from ..database import get_db
from ..deps import get_current_user
from ..models import Question, TestSeries, User
from ..schemas import (
    PaginatedQuestions,
    PaginatedTestSeriess,
    QuestionCreate,
    QuestionOut,
    TestSeriesCreate,
    TestSeriesOut,
    TestSeriesUpdate,
)

router = APIRouter(prefix="/test-series", tags=["test-series"])


def _get_series_or_404(db: Session, tenant_id: int, series_id: int) -> TestSeries:
    s = db.query(TestSeries).filter(TestSeries.id == series_id, TestSeries.tenant_id == tenant_id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="Test series not found")
    return s


@router.get("", response_model=PaginatedTestSeriess)
def list_series(
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(TestSeries).filter(TestSeries.tenant_id == user.tenant_id)
    if search:
        q = q.filter(TestSeries.title.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(TestSeries.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


@router.post("", response_model=TestSeriesOut, status_code=201)
def create_series(payload: TestSeriesCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = TestSeries(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    log_course_event(db, tenant_id=user.tenant_id, action="TEST_SERIES_CREATED",
                     course_id=None, course_title=s.title, user_id=user.id,
                     details=f"Test series '{s.title}' created")
    return s


@router.get("/{series_id}", response_model=TestSeriesOut)
def get_series(series_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_series_or_404(db, user.tenant_id, series_id)


@router.put("/{series_id}", response_model=TestSeriesOut)
def update_series(series_id: int, payload: TestSeriesUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_series_or_404(db, user.tenant_id, series_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{series_id}", status_code=204)
def delete_series(series_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_series_or_404(db, user.tenant_id, series_id)
    db.delete(s)
    db.commit()
    return None


# --- Questions ---
@router.get("/{series_id}/questions", response_model=PaginatedQuestions)
def list_questions(
    series_id: int,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_series_or_404(db, user.tenant_id, series_id)
    q = db.query(Question).filter(Question.tenant_id == user.tenant_id, Question.test_series_id == series_id)
    if search:
        q = q.filter(Question.question_text.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Question.id).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


@router.post("/{series_id}/questions", response_model=QuestionOut, status_code=201)
def create_question(series_id: int, payload: QuestionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_series_or_404(db, user.tenant_id, series_id)
    q = Question(tenant_id=user.tenant_id, test_series_id=series_id, **payload.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{series_id}/questions/{qid}", status_code=204)
def delete_question(series_id: int, qid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_series_or_404(db, user.tenant_id, series_id)
    q = db.query(Question).filter(Question.id == qid, Question.test_series_id == series_id, Question.tenant_id == user.tenant_id).first()
    if q is None:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return None
