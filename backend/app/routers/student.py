"""Student-facing mobile API (Phase 3).

Demo OTP auth: no real SMS. OTP is always "123456". Demo purchase creates a
real SUCCESS Order with a DEMO- transaction id; no payment gateway involved.
All endpoints are tenant-scoped to the authenticated student's tenant.
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import ALGORITHM, SECRET_KEY
from ..database import get_db
from ..deps import get_current_student
from ..models import (
    Banner,
    Bundle,
    Course,
    CurrentAffair,
    Ebook,
    Enquiry,
    Job,
    Note,
    Notification,
    Order,
    PreviousPaper,
    Question,
    Score,
    Seminar,
    Student,
    StudentTestAssignment,
    Submission,
    Teacher,
    Tenant,
    TestAssignment,
    TestSeries,
    Testimonial,
    Topper,
    VideoAssignment,
    YoutubeVideo,
)
from ..schemas import (
    BannerOut,
    BundleOut,
    CourseOut,
    CurrentAffairOut,
    EbookOut,
    EnquiryOut,
    JobOut,
    NoteOut,
    NotificationOut,
    OrderOut,
    PaginatedBanners,
    PaginatedBundles,
    PaginatedCourses,
    PaginatedCurrentAffairs,
    PaginatedEbooks,
    PaginatedJobs,
    PaginatedNotes,
    PaginatedNotifications,
    PaginatedOrders,
    PaginatedPreviousPapers,
    PaginatedScores,
    PaginatedSeminars,
    PaginatedTestSeriess,
    PaginatedTestimonials,
    PaginatedToppers,
    PaginatedYoutubeVideos,
    PreviousPaperOut,
    ScoreOut,
    SeminarOut,
    StudentTestAssignmentOut,
    SubmissionOut,
    TeacherOut,
    TestSeriesOut,
    TestimonialOut,
    TopperOut,
    VideoAssignmentOut,
    TestAssignmentOut,
    YoutubeVideoOut,
    mask_phone,
)

router = APIRouter(prefix="/student", tags=["student"])

DEMO_OTP = "123456"
_OPTION_LETTERS = ("A", "B", "C", "D")


class PaginatedTeachers(BaseModel):
    """{items, total} teacher list (admin teachers endpoint is unpaginated,
    so this shape is defined here for the student API)."""

    items: list[TeacherOut]
    total: int


# ---------- Request bodies ----------
class RequestOtpIn(BaseModel):
    org_code: str
    phone: str


class VerifyOtpIn(BaseModel):
    org_code: str
    phone: str
    otp: str
    name: str | None = None


class AttemptIn(BaseModel):
    # {question_id: selected_option_index} — index 0..3 maps to options A..D.
    answers: dict[str, int] = {}


class VideoSubmitIn(BaseModel):
    text: str | None = None
    file_name: str | None = None


class EnquiryIn(BaseModel):
    name: str | None = None
    message: str
    enquiry_type_id: int | None = None


# ---------- Helpers ----------
def _validate_phone(phone: str) -> str:
    if not isinstance(phone, str) or not phone.isdigit() or len(phone) != 10:
        raise HTTPException(status_code=400, detail="phone must be exactly 10 digits")
    return phone


def _tenant_by_org_code(db: Session, org_code: str) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.org_code == org_code).first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return tenant


def _course_list(db: Session, tenant_id: int, course_ids: list) -> list:
    if not course_ids:
        return []
    courses = db.query(Course).filter(Course.tenant_id == tenant_id, Course.id.in_(course_ids)).all()
    by_id = {c.id: c for c in courses}
    return [{"id": cid, "title": by_id[cid].title} if cid in by_id else {"id": cid} for cid in course_ids]


def _student_profile(db: Session, student: Student) -> dict:
    tenant = db.query(Tenant).filter(Tenant.id == student.tenant_id).first()
    return {
        "id": student.id,
        "name": student.name,
        "phone": student.phone,
        "masked_phone": mask_phone(student.phone),
        "email": student.email,
        "city": student.city,
        "state": student.state,
        "signup_date": student.signup_date,
        "courses": _course_list(db, student.tenant_id, student.course_ids or []),
        "tenant_id": student.tenant_id,
        "tenant_name": tenant.name if tenant else "",
        "org_code": tenant.org_code if tenant else "",
    }


def _list(q, page: int, per_page: int, order):
    total = q.count()
    items = q.order_by(order).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


def _student_token(student: Student) -> str:
    payload = {
        "sub": f"student:{student.id}",
        "tenant_id": student.tenant_id,
        "username": student.phone,
        "role": "student",
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _order_dict(order: Order) -> dict:
    return {**OrderOut.model_validate(order).model_dump(), "demo_purchase": True}


# ---------- Auth (demo OTP, no real SMS) ----------
@router.post("/auth/request-otp")
def request_otp(payload: RequestOtpIn, db: Session = Depends(get_db)):
    tenant = _tenant_by_org_code(db, payload.org_code)
    _validate_phone(payload.phone)
    return {
        "demo_otp": DEMO_OTP,
        "message": f"Demo mode: no real SMS sent. Use OTP {DEMO_OTP} to sign in to {tenant.name}.",
    }


@router.post("/auth/verify")
def verify_otp(payload: VerifyOtpIn, db: Session = Depends(get_db)):
    tenant = _tenant_by_org_code(db, payload.org_code)
    _validate_phone(payload.phone)
    if payload.otp != DEMO_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    student = (
        db.query(Student)
        .filter(Student.tenant_id == tenant.id, Student.phone == payload.phone)
        .first()
    )
    if student is None:
        if not payload.name:
            raise HTTPException(status_code=400, detail="name is required for first registration")
        student = Student(tenant_id=tenant.id, name=payload.name, phone=payload.phone)
        db.add(student)
        db.commit()
        db.refresh(student)
    return {
        "access_token": _student_token(student),
        "token_type": "bearer",
        "student": _student_profile(db, student),
    }


# ---------- Profile / home ----------
@router.get("/me")
def me(student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    return _student_profile(db, student)


@router.get("/home")
def home(student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    tid = student.tenant_id
    return {
        "banners": [
            BannerOut.model_validate(b).model_dump()
            for b in db.query(Banner).filter(Banner.tenant_id == tid).order_by(Banner.weight.desc(), Banner.id).limit(5).all()
        ],
        "featured_courses": [
            CourseOut.model_validate(c).model_dump()
            for c in db.query(Course).filter(Course.tenant_id == tid).order_by(Course.id).limit(5).all()
        ],
        "test_series": [
            TestSeriesOut.model_validate(t).model_dump()
            for t in db.query(TestSeries).filter(TestSeries.tenant_id == tid).order_by(TestSeries.id).limit(5).all()
        ],
        "current_affairs": [
            CurrentAffairOut.model_validate(c).model_dump()
            for c in db.query(CurrentAffair).filter(CurrentAffair.tenant_id == tid).order_by(CurrentAffair.id.desc()).limit(5).all()
        ],
        "jobs": [
            JobOut.model_validate(j).model_dump()
            for j in db.query(Job).filter(Job.tenant_id == tid).order_by(Job.id.desc()).limit(5).all()
        ],
        "toppers": [
            TopperOut.model_validate(t).model_dump()
            for t in db.query(Topper).filter(Topper.tenant_id == tid).order_by(Topper.rank, Topper.id).limit(5).all()
        ],
        "testimonials": [
            TestimonialOut.model_validate(t).model_dump()
            for t in db.query(Testimonial).filter(Testimonial.tenant_id == tid).order_by(Testimonial.id.desc()).limit(5).all()
        ],
    }


# ---------- Courses ----------
@router.get("/courses", response_model=PaginatedCourses)
def list_courses(
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    q = db.query(Course).filter(Course.tenant_id == student.tenant_id)
    if search:
        q = q.filter(Course.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, Course.position)


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: int, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.tenant_id == student.tenant_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/courses/{course_id}/purchase")
def purchase_course(course_id: int, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.tenant_id == student.tenant_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    existing = (
        db.query(Order)
        .filter(
            Order.tenant_id == student.tenant_id,
            Order.student_id == student.id,
            Order.status == "SUCCESS",
        )
        .all()
    )
    for order in existing:
        if course.title in (order.items or []):
            return _order_dict(order)
    order = Order(
        tenant_id=student.tenant_id,
        student_id=student.id,
        student_name=student.name,
        contact=student.phone,
        status="SUCCESS",
        transaction_id=f"DEMO-{uuid.uuid4().hex[:8].upper()}",
        amount=course.price,
        items=[course.title],
    )
    db.add(order)
    course_ids = list(student.course_ids or [])
    if course.id not in course_ids:
        course_ids.append(course.id)
        student.course_ids = course_ids
    db.commit()
    db.refresh(order)
    return _order_dict(order)


@router.get("/my-courses", response_model=PaginatedCourses)
def my_courses(student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    ids = student.course_ids or []
    q = db.query(Course).filter(Course.tenant_id == student.tenant_id, Course.id.in_(ids)) if ids else db.query(Course).filter(False)
    return _list(q, 1, 100, Course.id)


@router.get("/my-orders", response_model=PaginatedOrders)
def my_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    q = db.query(Order).filter(Order.tenant_id == student.tenant_id, Order.student_id == student.id)
    return _list(q, page, per_page, Order.id.desc())


# ---------- Content ----------
@router.get("/videos", response_model=PaginatedYoutubeVideos)
def list_videos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(YoutubeVideo).filter(YoutubeVideo.tenant_id == student.tenant_id), page, per_page, YoutubeVideo.id.desc())


@router.get("/notes", response_model=PaginatedNotes)
def list_notes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(Note).filter(Note.tenant_id == student.tenant_id), page, per_page, Note.id.desc())


@router.get("/previous-papers", response_model=PaginatedPreviousPapers)
def list_previous_papers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(PreviousPaper).filter(PreviousPaper.tenant_id == student.tenant_id), page, per_page, PreviousPaper.id.desc())


@router.get("/ebooks", response_model=PaginatedEbooks)
def list_ebooks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(Ebook).filter(Ebook.tenant_id == student.tenant_id), page, per_page, Ebook.id.desc())


@router.get("/syllabus", response_model=PaginatedNotes)
def list_syllabus(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    q = db.query(Note).filter(Note.tenant_id == student.tenant_id, Note.kind == "syllabus")
    return _list(q, page, per_page, Note.id.desc())


# ---------- Test series ----------
@router.get("/test-series", response_model=PaginatedTestSeriess)
def list_test_series(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(TestSeries).filter(TestSeries.tenant_id == student.tenant_id), page, per_page, TestSeries.id.desc())


@router.get("/test-series/{series_id}")
def get_test_series_detail(series_id: int, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    series = db.query(TestSeries).filter(TestSeries.id == series_id, TestSeries.tenant_id == student.tenant_id).first()
    if series is None:
        raise HTTPException(status_code=404, detail="Test series not found")
    questions = (
        db.query(Question)
        .filter(Question.tenant_id == student.tenant_id, Question.test_series_id == series_id)
        .order_by(Question.id)
        .all()
    )
    # NEVER expose the correct answer: id, question, options, marks only.
    return {
        **TestSeriesOut.model_validate(series).model_dump(),
        "questions": [
            {
                "id": q.id,
                "question": q.question_text,
                "options": [q.option_a, q.option_b, q.option_c, q.option_d],
                "marks": q.marks,
            }
            for q in questions
        ],
    }


@router.post("/test-series/{series_id}/attempt")
def attempt_test_series(series_id: int, payload: AttemptIn, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    series = db.query(TestSeries).filter(TestSeries.id == series_id, TestSeries.tenant_id == student.tenant_id).first()
    if series is None:
        raise HTTPException(status_code=404, detail="Test series not found")
    questions = (
        db.query(Question)
        .filter(Question.tenant_id == student.tenant_id, Question.test_series_id == series_id)
        .order_by(Question.id)
        .all()
    )
    total_marks = sum(q.marks for q in questions)
    score = 0.0
    correct = 0
    for q in questions:
        raw = payload.answers.get(str(q.id), payload.answers.get(q.id))  # type: ignore[arg-type]
        if raw is None:
            continue
        try:
            idx = int(raw)
        except (TypeError, ValueError):
            continue
        if 0 <= idx < len(_OPTION_LETTERS) and _OPTION_LETTERS[idx] == q.correct_option:
            score += q.marks
            correct += 1
        elif 0 <= idx < len(_OPTION_LETTERS):
            score -= q.negative_marks or 0.0
    score = max(0.0, score)
    db.add(Score(
        tenant_id=student.tenant_id,
        student_id=student.id,
        test_series_id=series.id,
        chapter_test=series.title,
        score=score,
        total_marks=total_marks,
    ))
    db.commit()
    return {"score": score, "total_marks": total_marks, "correct": correct, "total_questions": len(questions)}


@router.get("/scores", response_model=PaginatedScores)
def list_scores(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    q = db.query(Score).filter(Score.tenant_id == student.tenant_id, Score.student_id == student.id)
    return _list(q, page, per_page, Score.id.desc())


# ---------- Assignments ----------
@router.get("/assignments")
def list_assignments(student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    tid = student.tenant_id
    return {
        "video_assignments": [
            VideoAssignmentOut.model_validate(v).model_dump()
            for v in db.query(VideoAssignment).filter(VideoAssignment.tenant_id == tid).order_by(VideoAssignment.id.desc()).all()
        ],
        "test_assignments": [
            TestAssignmentOut.model_validate(t).model_dump()
            for t in db.query(TestAssignment).filter(TestAssignment.tenant_id == tid).order_by(TestAssignment.id.desc()).all()
        ],
    }


@router.post("/assignments/video/{aid}/submit", response_model=SubmissionOut, status_code=201)
def submit_video_assignment(aid: int, payload: VideoSubmitIn, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    assignment = db.query(VideoAssignment).filter(VideoAssignment.id == aid, VideoAssignment.tenant_id == student.tenant_id).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Video assignment not found")
    obj = Submission(
        tenant_id=student.tenant_id,
        assignment_id=aid,
        student_id=student.id,
        file_url=payload.file_name or "",
        text=payload.text or "",
        status="SUBMITTED",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/assignments/test/{aid}/submit", response_model=StudentTestAssignmentOut)
def submit_test_assignment(aid: int, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == aid, TestAssignment.tenant_id == student.tenant_id).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Test assignment not found")
    total_marks = 0.0
    if assignment.test_series_id:
        total_marks = sum(
            q.marks
            for q in db.query(Question).filter(
                Question.tenant_id == student.tenant_id,
                Question.test_series_id == assignment.test_series_id,
            ).all()
        )
    existing = (
        db.query(StudentTestAssignment)
        .filter(
            StudentTestAssignment.tenant_id == student.tenant_id,
            StudentTestAssignment.test_assignment_id == aid,
            StudentTestAssignment.student_id == student.id,
        )
        .first()
    )
    if existing is not None:
        existing.score = 0
        existing.total_marks = total_marks
        existing.status = "COMPLETED"
        db.commit()
        db.refresh(existing)
        return existing
    obj = StudentTestAssignment(
        tenant_id=student.tenant_id,
        test_assignment_id=aid,
        student_id=student.id,
        score=0,
        total_marks=total_marks,
        status="COMPLETED",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- Misc lists ----------
@router.get("/seminars", response_model=PaginatedSeminars)
def list_seminars(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(Seminar).filter(Seminar.tenant_id == student.tenant_id), page, per_page, Seminar.id.desc())


@router.get("/notifications", response_model=PaginatedNotifications)
def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(Notification).filter(Notification.tenant_id == student.tenant_id), page, per_page, Notification.id.desc())


@router.get("/teachers", response_model=PaginatedTeachers)
def list_teachers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(Teacher).filter(Teacher.tenant_id == student.tenant_id), page, per_page, Teacher.id.desc())


@router.get("/bundles", response_model=PaginatedBundles)
def list_bundles(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return _list(db.query(Bundle).filter(Bundle.tenant_id == student.tenant_id), page, per_page, Bundle.id.desc())


# ---------- Enquiries ----------
@router.post("/enquiries", response_model=EnquiryOut, status_code=201)
def create_enquiry(payload: EnquiryIn, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    if payload.enquiry_type_id is not None:
        from ..models import EnquiryType

        et = db.query(EnquiryType).filter(EnquiryType.id == payload.enquiry_type_id, EnquiryType.tenant_id == student.tenant_id).first()
        if et is None:
            raise HTTPException(status_code=404, detail="Enquiry type not found")
    obj = Enquiry(
        tenant_id=student.tenant_id,
        name=payload.name or student.name,
        email=student.email,
        phone=student.phone,
        message=payload.message,
        enquiry_type_id=payload.enquiry_type_id,
        status="NEW",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
