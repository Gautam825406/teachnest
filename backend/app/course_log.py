"""Shared helper: append a CourseLog row (System Logs, Phase 2 #23)."""
from sqlalchemy.orm import Session

from .models import CourseLog


def log_course_event(
    db: Session,
    *,
    tenant_id: int,
    action: str,
    course_id: int | None,
    course_title: str,
    user_id: int | None,
    details: str = "",
) -> CourseLog:
    entry = CourseLog(
        tenant_id=tenant_id,
        action=action,
        course_id=course_id,
        course_title=course_title or "",
        user_id=user_id,
        details=details or "",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
