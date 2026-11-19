"""Video Assignments + Submissions, Test Assignments, Scores (Phase 2 #3, #4, #5)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Score, Student, StudentTestAssignment, Submission, TestAssignment, User, VideoAssignment
from ..schemas import (
    PaginatedScores,
    PaginatedStudentTestAssignments,
    PaginatedSubmissions,
    PaginatedTestAssignments,
    PaginatedVideoAssignments,
    ScoreCreate,
    ScoreOut,
    ScoreSheetOut,
    StudentTestAssignmentCreate,
    StudentTestAssignmentOut,
    StudentTestAssignmentUpdate,
    SubmissionCreate,
    SubmissionOut,
    SubmissionUpdate,
    TestAssignmentCreate,
    TestAssignmentOut,
    TestAssignmentUpdate,
    VideoAssignmentCreate,
    VideoAssignmentOut,
    VideoAssignmentUpdate,
)

router = APIRouter(tags=["assignments"])


def _or_404(db, model, tenant_id, obj_id, label):
    obj = db.query(model).filter(model.id == obj_id, model.tenant_id == tenant_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


def _list(q, page, per_page, order):
    total = q.count()
    items = q.order_by(order).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


# ---------- Video Assignments ----------
@router.get("/video-assignments", response_model=PaginatedVideoAssignments)
def list_video_assignments(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(VideoAssignment).filter(VideoAssignment.tenant_id == user.tenant_id)
    if search:
        q = q.filter(VideoAssignment.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, VideoAssignment.id.desc())


@router.post("/video-assignments", response_model=VideoAssignmentOut, status_code=201)
def create_video_assignment(payload: VideoAssignmentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = VideoAssignment(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


# ---------- Submissions (must be defined before /video-assignments/{aid} conflicts are avoided:
# /video-assignments/submissions is a distinct static segment, FastAPI matches it first) ----------
@router.get("/video-assignments/submissions", response_model=PaginatedSubmissions)
def list_submissions(assignment_id: int | None = None, student_id: int | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Submission).filter(Submission.tenant_id == user.tenant_id)
    if assignment_id is not None:
        q = q.filter(Submission.assignment_id == assignment_id)
    if student_id is not None:
        q = q.filter(Submission.student_id == student_id)
    return _list(q, page, per_page, Submission.id.desc())


@router.post("/video-assignments/submissions", response_model=SubmissionOut, status_code=201)
def create_submission(payload: SubmissionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _or_404(db, VideoAssignment, user.tenant_id, payload.assignment_id, "Video assignment")
    obj = Submission(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.put("/video-assignments/submissions/{sid}", response_model=SubmissionOut)
def update_submission(sid: int, payload: SubmissionUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Submission, user.tenant_id, sid, "Submission")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj


@router.get("/video-assignments/{aid}", response_model=VideoAssignmentOut)
def get_video_assignment(aid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, VideoAssignment, user.tenant_id, aid, "Video assignment")


@router.put("/video-assignments/{aid}", response_model=VideoAssignmentOut)
def update_video_assignment(aid: int, payload: VideoAssignmentUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, VideoAssignment, user.tenant_id, aid, "Video assignment")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/video-assignments/{aid}", status_code=204)
def delete_video_assignment(aid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, VideoAssignment, user.tenant_id, aid, "Video assignment")
    db.delete(obj); db.commit()
    return None


# ---------- Test Assignments ----------
@router.get("/test-assignments", response_model=PaginatedTestAssignments)
def list_test_assignments(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(TestAssignment).filter(TestAssignment.tenant_id == user.tenant_id)
    if search:
        q = q.filter(TestAssignment.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, TestAssignment.id.desc())


@router.post("/test-assignments", response_model=TestAssignmentOut, status_code=201)
def create_test_assignment(payload: TestAssignmentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = TestAssignment(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/test-assignments/student-assignments", response_model=PaginatedStudentTestAssignments)
def list_student_assignments(test_assignment_id: int | None = None, student_id: int | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(StudentTestAssignment).filter(StudentTestAssignment.tenant_id == user.tenant_id)
    if test_assignment_id is not None:
        q = q.filter(StudentTestAssignment.test_assignment_id == test_assignment_id)
    if student_id is not None:
        q = q.filter(StudentTestAssignment.student_id == student_id)
    return _list(q, page, per_page, StudentTestAssignment.id.desc())


@router.post("/test-assignments/student-assignments", response_model=StudentTestAssignmentOut, status_code=201)
def create_student_assignment(payload: StudentTestAssignmentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _or_404(db, TestAssignment, user.tenant_id, payload.test_assignment_id, "Test assignment")
    obj = StudentTestAssignment(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.put("/test-assignments/student-assignments/{sid}", response_model=StudentTestAssignmentOut)
def update_student_assignment(sid: int, payload: StudentTestAssignmentUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, StudentTestAssignment, user.tenant_id, sid, "Student test assignment")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj


@router.get("/test-assignments/{aid}", response_model=TestAssignmentOut)
def get_test_assignment(aid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, TestAssignment, user.tenant_id, aid, "Test assignment")


@router.put("/test-assignments/{aid}", response_model=TestAssignmentOut)
def update_test_assignment(aid: int, payload: TestAssignmentUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, TestAssignment, user.tenant_id, aid, "Test assignment")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/test-assignments/{aid}", status_code=204)
def delete_test_assignment(aid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, TestAssignment, user.tenant_id, aid, "Test assignment")
    db.delete(obj); db.commit()
    return None


# ---------- Scores / Score Sheet ----------
@router.get("/scores", response_model=PaginatedScores)
def list_scores(test_series_id: int | None = None, chapter_test: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Score).filter(Score.tenant_id == user.tenant_id)
    if test_series_id is not None:
        q = q.filter(Score.test_series_id == test_series_id)
    if chapter_test:
        q = q.filter(Score.chapter_test == chapter_test)
    return _list(q, page, per_page, Score.id.desc())


@router.post("/scores", response_model=ScoreOut, status_code=201)
def create_score(payload: ScoreCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Score(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/score-sheet", response_model=ScoreSheetOut)
def score_sheet(test_series_id: int | None = None, chapter_test: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Score).filter(Score.tenant_id == user.tenant_id)
    if test_series_id is not None:
        q = q.filter(Score.test_series_id == test_series_id)
    if chapter_test:
        q = q.filter(Score.chapter_test == chapter_test)
    students = []
    for s in q.order_by(Score.id).all():
        stu = db.query(Student).filter(Student.id == s.student_id, Student.tenant_id == user.tenant_id).first() if s.student_id else None
        students.append({"student_id": s.student_id, "student_name": stu.name if stu else "", "score": s.score, "total_marks": s.total_marks})
    return {"students": students}
