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
    AppliedCoupon,
    Author,
    Banner,
    Bundle,
    Course,
    CourseCategory,
    CourseLog,
    CourseSubcategory,
    Coupon,
    CurrentAffair,
    Ebook,
    EbookBanner,
    EbookType,
    Enquiry,
    EnquiryType,
    ExamType,
    Job,
    Lead,
    Note,
    Notification,
    Order,
    OtpUsage,
    PreviousPaper,
    Question,
    Role,
    Score,
    Seminar,
    Settings,
    Student,
    StudentTestAssignment,
    Submission,
    Teacher,
    Tenant,
    TestAssignment,
    TestSeries,
    Testimonial,
    Topper,
    User,
    VideoAssignment,
    YoutubeVideo,
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



def _seed_phase2(db: Session, tenant: Tenant) -> None:
    """Phase 2 demo rows for Demo Academy only. Idempotent."""
    if db.query(TestSeries).filter(TestSeries.tenant_id == tenant.id).first():
        return
    courses = db.query(Course).filter(Course.tenant_id == tenant.id).order_by(Course.id).all()
    students = db.query(Student).filter(Student.tenant_id == tenant.id).order_by(Student.id).all()
    orders = db.query(Order).filter(Order.tenant_id == tenant.id).order_by(Order.id).all()
    if not courses or not students:
        return
    c1, s1, s2 = courses[0], students[0], students[1] if len(students) > 1 else students[0]
    now = datetime.utcnow()

    # Test series + questions (2 x 3)
    series = []
    for title, cat in (("Hindi Class 12 Test Series", "Hindi"), ("English Class 12 Test Series", "English")):
        ts = TestSeries(tenant_id=tenant.id, title=title, description=f"Demo {title.lower()}.", category=cat, price=499, validity_days=180, is_active=True)
        db.add(ts); series.append(ts)
    db.commit()
    for ts in series:
        db.refresh(ts)
    for ts in series:
        for i in range(1, 4):
            db.add(Question(tenant_id=tenant.id, test_series_id=ts.id, chapter_test=f"Chapter {i} Test",
                             question_text=f"Demo question {i} for {ts.title}?", option_a="Option A", option_b="Option B",
                             option_c="Option C", option_d="Option D", correct_option="A", marks=1, negative_marks=0.25))
    db.commit()

    # Video assignment + submissions
    va = VideoAssignment(tenant_id=tenant.id, title="Hindi Grammar Video Assignment", course_id=c1.id,
                         video_url="https://www.youtube.com/watch?v=demo123", description="Watch and summarise the video.",
                         due_date=(now + timedelta(days=7)).date())
    db.add(va); db.commit(); db.refresh(va)
    db.add_all([
        Submission(tenant_id=tenant.id, assignment_id=va.id, student_id=s1.id, file_url="", text="My summary of the video.", marks=8, feedback="Good work.", status="GRADED"),
        Submission(tenant_id=tenant.id, assignment_id=va.id, student_id=s2.id, file_url="", text="Video summary submitted.", status="SUBMITTED"),
    ])
    db.commit()

    # Test assignment + student assignments
    ta = TestAssignment(tenant_id=tenant.id, title="Hindi Class 12 — Weekly Test", test_series_id=series[0].id, student_id=None, due_date=(now + timedelta(days=5)).date())
    db.add(ta); db.commit(); db.refresh(ta)
    db.add_all([
        StudentTestAssignment(tenant_id=tenant.id, test_assignment_id=ta.id, student_id=s1.id, score=18, total_marks=20, status="COMPLETED"),
        StudentTestAssignment(tenant_id=tenant.id, test_assignment_id=ta.id, student_id=s2.id, score=0, total_marks=20, status="ASSIGNED"),
    ])
    db.commit()

    # Scores (3)
    db.add_all([
        Score(tenant_id=tenant.id, student_id=s1.id, test_series_id=series[0].id, chapter_test="Chapter 1 Test", score=9, total_marks=10),
        Score(tenant_id=tenant.id, student_id=s2.id, test_series_id=series[0].id, chapter_test="Chapter 1 Test", score=7, total_marks=10),
        Score(tenant_id=tenant.id, student_id=s1.id, test_series_id=series[1].id, chapter_test="Chapter 1 Test", score=8, total_marks=10),
    ])
    db.commit()

    # Notes (3, one per kind)
    db.add_all([
        Note(tenant_id=tenant.id, title="Hindi Grammar Notes", folder="Hindi", kind="note", description="Demo class notes."),
        Note(tenant_id=tenant.id, title="Class 12 Folder", folder="Class 12", kind="folder", description="Demo folder."),
        Note(tenant_id=tenant.id, title="Class 12 Syllabus", folder="Class 12", kind="syllabus", description="Demo syllabus."),
    ])
    db.commit()

    # Exam types + previous papers
    ets = []
    for name in ("CBSE Board", "State Board"):
        et = ExamType(tenant_id=tenant.id, name=name); db.add(et); ets.append(et)
    db.commit()
    for et in ets:
        db.refresh(et)
    db.add_all([
        PreviousPaper(tenant_id=tenant.id, title="CBSE Hindi 2024 Paper", exam_type_id=ets[0].id, year=2024, file_url=""),
        PreviousPaper(tenant_id=tenant.id, title="State Board English 2023 Paper", exam_type_id=ets[1].id, year=2023, file_url=""),
    ])
    db.commit()

    # E-book types, authors, e-books, banner
    ebook_types = []
    for name in ("Grammar", "Literature"):
        et = EbookType(tenant_id=tenant.id, name=name); db.add(et); ebook_types.append(et)
    db.commit()
    for et in ebook_types:
        db.refresh(et)
    authors = []
    for name, bio in (("Ranjeet Kumar", "Demo Hindi author."), ("Meera Nair", "Demo English author.")):
        a = Author(tenant_id=tenant.id, name=name, bio=bio); db.add(a); authors.append(a)
    db.commit()
    for a in authors:
        db.refresh(a)
    db.add_all([
        Ebook(tenant_id=tenant.id, title="Hindi Grammar Guide", author_id=authors[0].id, ebook_type_id=ebook_types[0].id, price=199, file_url="", cover_url=""),
        Ebook(tenant_id=tenant.id, title="English Literature Reader", author_id=authors[1].id, ebook_type_id=ebook_types[1].id, price=249, file_url="", cover_url=""),
    ])
    db.add(EbookBanner(tenant_id=tenant.id, title="New E-Books Out Now", image_url="", weight=10, status="ACTIVE"))
    db.commit()

    db.add(Seminar(tenant_id=tenant.id, title="How to Score 95+ in Hindi", description="Demo seminar.", category="Hindi", scheduled_at=now + timedelta(days=3), meeting_url=""))
    db.add(Bundle(tenant_id=tenant.id, name="Class 12 Mega Bundle", description="Demo bundle.", price=2999, course_ids=[c1.id], test_series_ids=[series[0].id], ebook_ids=[]))
    db.add_all([
        YoutubeVideo(tenant_id=tenant.id, video_id="demo123", title="Hindi Grammar Basics", category="Hindi"),
        YoutubeVideo(tenant_id=tenant.id, video_id="demo456", title="English Speaking Tips", category="English"),
    ])
    db.commit()

    db.add_all([
        Lead(tenant_id=tenant.id, name="Demo Custom Lead", phone="9876500101", email="lead1@example.com", source="Website", type="custom", status="NEW"),
        Lead(tenant_id=tenant.id, name="Demo Signup Lead", phone="9876500102", email="lead2@example.com", source="App Signup", type="signup", status="NEW"),
        Lead(tenant_id=tenant.id, name="Demo Expired Lead", phone="9876500103", email="lead3@example.com", source="Old Campaign", type="expired", status="CLOSED"),
    ])
    db.add_all([
        Testimonial(tenant_id=tenant.id, student_name=s1.name, text="Great teaching, very helpful classes.", rating=5),
        Testimonial(tenant_id=tenant.id, student_name=s2.name, text="Notes and tests helped me a lot.", rating=4),
    ])
    db.add_all([
        Topper(tenant_id=tenant.id, student_id=s1.id, student_name=s1.name, exam="CBSE Class 12 Hindi", rank=1, score=98),
        Topper(tenant_id=tenant.id, student_id=s2.id, student_name=s2.name, exam="CBSE Class 12 English", rank=2, score=95),
    ])
    db.add_all([
        Banner(tenant_id=tenant.id, name="Admissions Open", image_url="", banner_type="HOME", redirection_type="COURSE", redirection_value=str(c1.id), placement="TOP", weight=10, status="ACTIVE", popup=False),
        Banner(tenant_id=tenant.id, name="New Test Series", image_url="", banner_type="HOME", redirection_type="TEST_SERIES", redirection_value=str(series[0].id), placement="MIDDLE", weight=5, status="ACTIVE", popup=False),
        Banner(tenant_id=tenant.id, name="Festive Offer", image_url="", banner_type="POPUP", redirection_type="NONE", redirection_value="", placement="POPUP", weight=1, status="ACTIVE", popup=True),
    ])
    db.add_all([
        Notification(tenant_id=tenant.id, title="New Test Series Live", body="Hindi Class 12 Test Series is now live.", audience="ALL", status="SENT"),
        Notification(tenant_id=tenant.id, title="Seminar Reminder", body="Join the seminar this week.", audience="ALL", status="SENT"),
    ])
    db.add_all([
        CurrentAffair(tenant_id=tenant.id, title="Demo Current Affair 1", language="en", content="Demo content.", published_date=now.date()),
        CurrentAffair(tenant_id=tenant.id, title="Demo Current Affair 2", language="hi", content="Demo content in Hindi.", published_date=now.date()),
        CurrentAffair(tenant_id=tenant.id, title="Demo Current Affair 3", language="en", content="Demo content.", published_date=(now - timedelta(days=1)).date()),
    ])
    db.add_all([
        Job(tenant_id=tenant.id, title="Demo Teaching Job", thumbnail_url="", description="Demo job posting."),
        Job(tenant_id=tenant.id, title="Demo Content Writer Job", thumbnail_url="", description="Demo job posting."),
    ])
    db.commit()

    coupons = []
    for code, pct in (("WELCOME10", 10), ("FESTIVE20", 20)):
        cp = Coupon(tenant_id=tenant.id, code=code, discount_percent=pct, max_discount=500, valid_from=now.date(), valid_to=(now + timedelta(days=90)).date(), is_active=True)
        db.add(cp); coupons.append(cp)
    db.commit()
    for cp in coupons:
        db.refresh(cp)
    db.add(AppliedCoupon(tenant_id=tenant.id, coupon_id=coupons[0].id, student_id=s1.id, order_id=orders[0].id if orders else None))
    db.add_all([
        OtpUsage(tenant_id=tenant.id, otp="123456", mobile="9876500001"),
        OtpUsage(tenant_id=tenant.id, otp="654321", mobile="9876500002"),
        OtpUsage(tenant_id=tenant.id, otp="112233", mobile="9876500003"),
    ])
    enquiry_types = []
    for name in ("Admission", "General"):
        et = EnquiryType(tenant_id=tenant.id, name=name); db.add(et); enquiry_types.append(et)
    db.commit()
    for et in enquiry_types:
        db.refresh(et)
    db.add_all([
        Enquiry(tenant_id=tenant.id, name="Demo Parent", email="parent@example.com", phone="9876500201", message="Admission enquiry for Class 12.", enquiry_type_id=enquiry_types[0].id, status="NEW"),
        Enquiry(tenant_id=tenant.id, name="Demo Student", email="student@example.com", phone="9876500202", message="General enquiry about courses.", enquiry_type_id=enquiry_types[1].id, status="NEW"),
    ])
    db.commit()

    # Second visible user (admin is the first)
    _ensure_admin(db, tenant, "teacher1", "teacher1@demoacademy.local", "Teacher@123")
    db.query(User).filter(User.tenant_id == tenant.id, User.username == "teacher1").update({"role": "Teacher"})

    # Course logs (3)
    db.add_all([
        CourseLog(tenant_id=tenant.id, action="COURSE_CREATED", course_id=c1.id, course_title=c1.title, user_id=None, details="Seeded course log."),
        CourseLog(tenant_id=tenant.id, action="TEST_SERIES_CREATED", course_id=None, course_title=series[0].title, user_id=None, details="Seeded test series log."),
        CourseLog(tenant_id=tenant.id, action="COURSE_UPDATED", course_id=c1.id, course_title=c1.title, user_id=None, details="Seeded course log."),
    ])
    db.commit()


def _seed_demo_academy(db: Session, tenant: Tenant) -> None:
    _ensure_roles(db, tenant)
    _ensure_settings(db, tenant)
    if db.query(Course).filter(Course.tenant_id == tenant.id).first():
        _seed_phase2(db, tenant)  # backfill Phase 2 rows on already-seeded DBs
        return  # already seeded (Phase 1)

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
    _seed_phase2(db, tenant)


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
