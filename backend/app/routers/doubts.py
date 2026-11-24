"""Doubt Engine: students ask questions in the app, get an instant AI
answer when the institute has a Groq or Gemini key, and a teacher reply
from the admin panel.

AI answers are always labelled as AI-generated in the app ("AI answer —
verify with your teacher") and are never presented as a teacher reply.
When no provider key is configured the doubt simply stays "open" until a
teacher replies — the API never invents an answer.

Student endpoints (student JWT): POST /student/doubts, GET
/student/doubts, GET /student/doubts/{id}, GET /student/doubts/subjects.
Teacher endpoints (admin User JWT, role Teacher / Super Admin / Admin):
GET /teacher/doubts, GET /teacher/doubts/{id}, POST
/teacher/doubts/{id}/reply.
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_student, get_current_user
from ..models import Doubt, Student, Subject, User
from ..provider_keys import resolve_provider_key
from .integrations import _call_gemini, _call_groq

router = APIRouter(tags=["doubts"])

MAX_QUESTION_LEN = 2000
MAX_REPLY_LEN = 5000


def doubt_out(d: Doubt) -> dict:
    return {
        "id": d.id,
        "tenant_id": d.tenant_id,
        "student_id": d.student_id,
        "student_name": d.student_name or "",
        "subject": d.subject or "",
        "topic": d.topic or "",
        "question": d.question,
        "ai_answer": d.ai_answer or "",
        "ai_provider": d.ai_provider or "",
        "teacher_reply": d.teacher_reply or "",
        "teacher_id": d.teacher_id,
        "teacher_name": d.teacher_name or "",
        "status": d.status,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "answered_at": d.answered_at.isoformat() if d.answered_at else None,
    }


def _ai_answer_doubt(db: Session, tenant_id: int, subject: str, topic: str, question: str):
    """Try Groq first, then Gemini. Returns (answer, provider) or None when
    no key is configured or both providers fail. Never raises."""
    prompt = (
        "You are a friendly school teacher answering a student's doubt. "
        "Answer clearly and simply, in plain language a Class 6-12 student can follow. "
        "Keep the answer short (under 200 words). If the question is unclear or you are "
        "not sure of the answer, say so honestly instead of guessing. "
        f"Subject: {subject or 'General'}. Topic: {topic or '-'}. "
        f"Student's question: {question}\n"
        'Return ONLY a JSON object: {"answer": "..."}'
    )
    for provider, caller in (("groq", _call_groq), ("gemini", _call_gemini)):
        key = resolve_provider_key(db, tenant_id, provider)
        if not key:
            continue
        try:
            raw = caller(key, prompt)
            parsed = json.loads(raw)
            answer = str(parsed.get("answer") or "").strip() if isinstance(parsed, dict) else ""
            if answer:
                return answer, provider
        except Exception:
            continue  # provider failed — try the next one, else no AI answer
    return None


def _require_teacher(user: User) -> None:
    if (user.role or "") not in ("Teacher", "Super Admin", "Admin"):
        raise HTTPException(status_code=403, detail="Only a teacher or admin can view and answer doubts")


class DoubtCreateIn(BaseModel):
    subject: str = ""
    topic: str = ""
    question: str = ""


class DoubtReplyIn(BaseModel):
    reply: str = ""


# ---------- Student ----------
@router.post("/student/doubts", status_code=201)
def student_create_doubt(
    payload: DoubtCreateIn,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    if len(question) > MAX_QUESTION_LEN:
        raise HTTPException(status_code=400, detail=f"Question must be under {MAX_QUESTION_LEN} characters")
    subject = (payload.subject or "").strip() or "General"
    doubt = Doubt(
        tenant_id=student.tenant_id,
        student_id=student.id,
        student_name=student.name or "",
        subject=subject,
        topic=(payload.topic or "").strip(),
        question=question,
        status="open",
    )
    db.add(doubt)
    db.commit()
    db.refresh(doubt)
    # Instant AI answer when a provider key is configured (Groq first,
    # Gemini fallback). No key / provider error → stays "open".
    ai = _ai_answer_doubt(db, student.tenant_id, subject, doubt.topic, question)
    if ai is not None:
        doubt.ai_answer, doubt.ai_provider = ai
        doubt.status = "ai_answered"
        db.commit()
        db.refresh(doubt)
    return doubt_out(doubt)


@router.get("/student/doubts")
def student_list_doubts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Doubt)
        .filter(Doubt.tenant_id == student.tenant_id, Doubt.student_id == student.id)
        .order_by(Doubt.id.desc())
    )
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [doubt_out(d) for d in items], "total": total}


@router.get("/student/doubts/subjects")
def student_doubt_subjects(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Subject names from the student's enrolled courses, for the Ask-a-Doubt
    subject picker. Falls back to an empty list (the app then lets the
    student type a subject)."""
    course_ids = list(student.course_ids or [])
    names: list[str] = []
    if course_ids:
        rows = (
            db.query(Subject.name)
            .filter(Subject.tenant_id == student.tenant_id, Subject.course_id.in_(course_ids))
            .order_by(Subject.name)
            .all()
        )
        seen = set()
        for (name,) in rows:
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return {"subjects": names}


@router.get("/student/doubts/{doubt_id}")
def student_get_doubt(
    doubt_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    doubt = (
        db.query(Doubt)
        .filter(Doubt.tenant_id == student.tenant_id, Doubt.student_id == student.id, Doubt.id == doubt_id)
        .first()
    )
    if doubt is None:
        raise HTTPException(status_code=404, detail="Doubt not found")
    return doubt_out(doubt)


# ---------- Teacher / admin ----------
@router.get("/teacher/doubts")
def teacher_list_doubts(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_teacher(user)
    q = db.query(Doubt).filter(Doubt.tenant_id == user.tenant_id)
    if status:
        q = q.filter(Doubt.status == status)
    q = q.order_by(Doubt.id.desc())
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [doubt_out(d) for d in items], "total": total}


@router.get("/teacher/doubts/{doubt_id}")
def teacher_get_doubt(
    doubt_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_teacher(user)
    doubt = db.query(Doubt).filter(Doubt.tenant_id == user.tenant_id, Doubt.id == doubt_id).first()
    if doubt is None:
        raise HTTPException(status_code=404, detail="Doubt not found")
    return doubt_out(doubt)


@router.post("/teacher/doubts/{doubt_id}/reply")
def teacher_reply_doubt(
    doubt_id: int,
    payload: DoubtReplyIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_teacher(user)
    reply = (payload.reply or "").strip()
    if not reply:
        raise HTTPException(status_code=400, detail="Reply is required")
    if len(reply) > MAX_REPLY_LEN:
        raise HTTPException(status_code=400, detail=f"Reply must be under {MAX_REPLY_LEN} characters")
    doubt = db.query(Doubt).filter(Doubt.tenant_id == user.tenant_id, Doubt.id == doubt_id).first()
    if doubt is None:
        raise HTTPException(status_code=404, detail="Doubt not found")
    doubt.teacher_reply = reply
    doubt.teacher_id = user.id
    doubt.teacher_name = user.username or ""
    doubt.status = "answered"
    doubt.answered_at = datetime.utcnow()
    db.commit()
    db.refresh(doubt)
    return doubt_out(doubt)
