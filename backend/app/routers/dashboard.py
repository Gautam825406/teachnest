from datetime import date, datetime, time

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import cashfree_configured

from ..database import get_db
from ..deps import get_current_user
from ..models import Course, Order, Student, Teacher, User
from ..schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def stats(
    start_date: date | None = None,
    end_date: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tid = user.tenant_id
    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_end = datetime.combine(today, time.max)

    def _range_filter(query, column):
        if start_date:
            query = query.filter(column >= datetime.combine(start_date, time.min))
        if end_date:
            query = query.filter(column <= datetime.combine(end_date, time.max))
        return query

    # Earnings: SUCCESS orders only.
    total_q = db.query(func.coalesce(func.sum(Order.amount), 0.0)).filter(
        Order.tenant_id == tid, Order.status == "SUCCESS"
    )
    total_q = _range_filter(total_q, Order.created_at)
    total_earnings = float(total_q.scalar() or 0.0)

    todays_earnings = float(
        db.query(func.coalesce(func.sum(Order.amount), 0.0))
        .filter(Order.tenant_id == tid, Order.status == "SUCCESS",
                Order.created_at >= today_start, Order.created_at <= today_end)
        .scalar() or 0.0
    )

    joined_q = db.query(func.count(Student.id)).filter(Student.tenant_id == tid)
    if start_date or end_date:
        joined_q = _range_filter(joined_q, Student.signup_date)
        recently_joined = int(joined_q.scalar() or 0)
    else:
        recently_joined = int(
            db.query(func.count(Student.id))
            .filter(Student.tenant_id == tid, Student.signup_date >= today_start,
                    Student.signup_date <= today_end)
            .scalar() or 0
        )

    total_students = int(db.query(func.count(Student.id)).filter(Student.tenant_id == tid).scalar() or 0)
    total_courses = int(db.query(func.count(Course.id)).filter(Course.tenant_id == tid).scalar() or 0)
    total_teachers = int(db.query(func.count(Teacher.id)).filter(Teacher.tenant_id == tid).scalar() or 0)
    total_orders = int(db.query(func.count(Order.id)).filter(Order.tenant_id == tid).scalar() or 0)
    # "Classes taken" = total course enrolments across students (no separate
    # class/attendance model exists in Phase 1).
    total_classes_taken = 0
    for (course_ids,) in db.query(Student.course_ids).filter(Student.tenant_id == tid).all():
        total_classes_taken += len(course_ids or [])

    return DashboardStats(
        todays_earnings=todays_earnings,
        recently_joined=recently_joined,
        total_earnings=total_earnings,
        total_classes_taken=total_classes_taken,
        total_courses=total_courses,
        total_students=total_students,
        total_teachers=total_teachers,
        total_orders=total_orders,
        video_storage_mb=0.0,
        video_storage_limit_gb=1024.0,
        storage_plan="FREE",
        wallet_balance=0.0,
        payment_gateway={"provider": "Cashfree", "status": "LINKED" if cashfree_configured() else "NOT_CONFIGURED", "merchant_id": None},
    )
