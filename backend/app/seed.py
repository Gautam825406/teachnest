"""Seed demo data. Idempotent: safe to run repeatedly / on every startup.

Demo tenants (clearly demo data, for local development only):
  - "Demo Academy", org_code DEMO0001, Super Admin admin / Admin@123
  - "Second Academy", org_code SECN0002, Super Admin secondadmin / Second@123
    (exists ONLY for tenant-isolation verification)
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import (
    Course,
    CourseCategory,
    CourseSubcategory,
    Order,
    Role,
    Settings,
    Student,
    Teacher,
    Tenant,
    User,
)
from .permissions import PERMISSIONS, TEACHER_PERMISSIONS
from .security import hash_password


def _get_or_create_tenant(db: Session, name: str, org_code: str) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.org_code == org_code).first()
    if tenant:
        return tenant
    tenant = Tenant(name=name, org_code=org_code)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def _ensure_admin(db: Session, tenant: Tenant, username: str, email: str, password: str) -> User:
    user = (
        db.query(User)
        .filter(User.tenant_id == tenant.id, User.username == username)
        .first()
    )
    if user:
        return user
    user = User(
        tenant_id=tenant.id,
        username=username,
        email=email,
        password_hash=hash_password(password),
        role="Super Admin",
    )
    db.add(user)
    db.commit()
    return user


def _ensure_roles(db: Session, tenant: Tenant) -> None:
    if db.query(Role).filter(Role.tenant_id == tenant.id).first():
        return
    db.add_all(
        [
            Role(tenant_id=tenant.id, name="Admin", is_system_default=True, permissions=list(PERMISSIONS)),
            Role(tenant_id=tenant.id, name="Teacher", is_system_default=False, permissions=list(TEACHER_PERMISSIONS)),
        ]
    )
    db.commit()


def _ensure_settings(db: Session, tenant: Tenant) -> None:
    if db.query(Settings).filter(Settings.tenant_id == tenant.id).first():
        return
    db.add(
        Settings(
            tenant_id=tenant.id,
            company_name=tenant.name,
            email="support@demoacademy.local",
            phone="9876543210",
            support_technical="support@demoacademy.local",
            support_general="hello@demoacademy.local",
            support_billing="billing@demoacademy.local",
            headquarters="Demo City",
            website="https://demoacademy.local",
            whatsapp="9876543210",
            instagram="",
            youtube="",
            gst_rate=0.0,
            gstin="",
            about_us=f"{tenant.name} is a demo coaching institute created for local development.",
            privacy_policy="Demo privacy policy.",
            refund_policy="Demo refund policy.",
            terms="Demo terms and conditions.",
        )
    )
    db.commit()


def _seed_demo_academy(db: Session, tenant: Tenant) -> None:
    _ensure_roles(db, tenant)
    _ensure_settings(db, tenant)
    if db.query(Course).filter(Course.tenant_id == tenant.id).first():
        return  # already seeded

    now = datetime.utcnow()
    cat_hindi = CourseCategory(tenant_id=tenant.id, name="Hindi")
    cat_eng = CourseCategory(tenant_id=tenant.id, name="English")
    db.add_all([cat_hindi, cat_eng])
    db.commit()
    db.refresh(cat_hindi)
    db.refresh(cat_eng)
    sub_h12 = CourseSubcategory(tenant_id=tenant.id, name="Class 12", category_id=cat_hindi.id)
    sub_e11 = CourseSubcategory(tenant_id=tenant.id, name="Class 11", category_id=cat_eng.id)
    sub_e12 = CourseSubcategory(tenant_id=tenant.id, name="Class 12", category_id=cat_eng.id)
    db.add_all([sub_h12, sub_e11, sub_e12])
    db.commit()
    db.refresh(sub_h12)
    db.refresh(sub_e11)
    db.refresh(sub_e12)

    teacher = Teacher(
        tenant_id=tenant.id,
        name="Ranjeet Kumar",
        subject="Hindi",
        email="ranjeet@demoacademy.local",
        phone="9876543210",
        experience_years=8,
        display_weight=10,
        tagline="Hindi made simple",
        quote="Practice makes perfect.",
        categories=["Hindi"],
        biography="Demo teacher for Hindi Class 12.",
        photo_url="",
        is_active=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    courses_data = [
        ("Hindi Class 12", 2999, 1999, 365, "Complete Hindi course for Class 12.", cat_hindi.id, sub_h12.id, [teacher.id]),
        ("English Class 12", 2999, 1999, 365, "Complete English course for Class 12.", cat_eng.id, sub_e12.id, []),
        ("English Class 11", 2499, 1499, 365, "Complete English course for Class 11.", cat_eng.id, sub_e11.id, []),
        ("Hindi Grammar Foundation", 1499, 999, 180, "Hindi grammar foundation course.", cat_hindi.id, sub_h12.id, [teacher.id]),
        ("English Speaking Practice", 1999, 1299, 180, "Spoken English practice course.", cat_eng.id, sub_e12.id, []),
    ]
    courses = []
    for i, (title, mrp, price, validity, desc, cat_id, sub_id, tids) in enumerate(courses_data):
        c = Course(
            tenant_id=tenant.id, title=title, mrp=mrp, price=price,
            validity_days=validity, description=desc, category_id=cat_id,
            subcategory_id=sub_id, position=i + 1, teacher_ids=tids,
        )
        db.add(c)
        courses.append(c)
    db.commit()
    for c in courses:
        db.refresh(c)

    students_data = [
        ("Aarav Sharma", "9876500001", "aarav@example.com", "Hazaribagh", "Jharkhand", 0),
        ("Priya Verma", "9876500002", "priya@example.com", "Ranchi", "Jharkhand", 1),
        ("Rahul Singh", "9876500003", "rahul@example.com", "Patna", "Bihar", 2),
        ("Sneha Gupta", "9876500004", "sneha@example.com", "Hazaribagh", "Jharkhand", 0),
        ("Vikram Yadav", "9876500005", "vikram@example.com", "Dhanbad", "Jharkhand", 3),
        ("Anita Kumari", "9876500006", "anita@example.com", "Ranchi", "Jharkhand", 1),
        ("Rohit Kumar", "9876500007", "rohit@example.com", "Gaya", "Bihar", 4),
        ("Meera Nair", "9876500008", "meera@example.com", "Hazaribagh", "Jharkhand", 2),
    ]
    students = []
    for name, phone, email, city, state, days_ago in students_data:
        s = Student(
            tenant_id=tenant.id, name=name, phone=phone, email=email,
            city=city, state=state,
            signup_date=now - timedelta(days=days_ago),
            course_ids=[courses[0].id] if name in ("Aarav Sharma", "Sneha Gupta") else [courses[1].id],
        )
        db.add(s)
        students.append(s)
    db.commit()
    for s in students:
        db.refresh(s)

    orders_data = [
        (students[0], "SUCCESS", "TXNDEMO0001", 1999.0, ["Hindi Class 12"], 0),
        (students[1], "SUCCESS", "TXNDEMO0002", 1999.0, ["English Class 12"], 1),
        (students[2], "PENDING", "TXNDEMO0003", 1499.0, ["English Class 11"], 1),
        (students[3], "SUCCESS", "TXNDEMO0004", 1999.0, ["Hindi Class 12"], 2),
        (students[4], "SUCCESS", "TXNDEMO0005", 999.0, ["Hindi Grammar Foundation"], 0),
    ]
    for student, status, txn, amount, items, days_ago in orders_data:
        db.add(Order(
            tenant_id=tenant.id, student_id=student.id, student_name=student.name,
            contact=student.phone, status=status, transaction_id=txn,
            amount=amount, items=items,
            created_at=now - timedelta(days=days_ago),
        ))
    db.commit()


def _seed_second_academy(db: Session, tenant: Tenant) -> None:
    _ensure_roles(db, tenant)
    _ensure_settings(db, tenant)
    if db.query(Course).filter(Course.tenant_id == tenant.id).first():
        return
    now = datetime.utcnow()
    cat = CourseCategory(tenant_id=tenant.id, name="General")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    course = Course(
        tenant_id=tenant.id, title="Second Academy Demo Course", mrp=999, price=499,
        validity_days=90, description="Demo course belonging only to Second Academy.",
        category_id=cat.id, position=1,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    db.add(Student(
        tenant_id=tenant.id, name="Second Student", phone="9123456780",
        email="secondstudent@example.com", city="Demo City", state="Demo State",
        signup_date=now, course_ids=[course.id],
    ))
    db.commit()


def seed(db: Session | None = None) -> None:
    own = db is None
    db = db or SessionLocal()
    try:
        demo = _get_or_create_tenant(db, "Demo Academy", "DEMO0001")
        _ensure_admin(db, demo, "admin", "admin@demoacademy.local", "Admin@123")
        _seed_demo_academy(db, demo)
        second = _get_or_create_tenant(db, "Second Academy", "SECN0002")
        _ensure_admin(db, second, "secondadmin", "secondadmin@demoacademy.local", "Second@123")
        _seed_second_academy(db, second)
    finally:
        if own:
            db.close()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    seed()
    print("Seed complete: Demo Academy (DEMO0001) and Second Academy (SECN0002).")


if __name__ == "__main__":
    main()
