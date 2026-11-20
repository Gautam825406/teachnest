from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)

from .database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    org_code = Column(String(8), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "username", name="uq_user_tenant_username"),)
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False, default="Super Admin")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_system_default = Column(Boolean, default=False, nullable=False)
    permissions = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CourseCategory(Base):
    __tablename__ = "course_categories"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CourseSubcategory(Base):
    __tablename__ = "course_subcategories"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("course_categories.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(10), nullable=False)
    experience_years = Column(Integer, default=0, nullable=False)
    display_weight = Column(Integer, default=0, nullable=False)
    tagline = Column(String(500), default="", nullable=False)
    quote = Column(Text, default="", nullable=False)
    categories = Column(JSON, default=list, nullable=False)
    biography = Column(Text, default="", nullable=False)
    photo_url = Column(String(1024), default="", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    mrp = Column(Float, default=0.0, nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    validity_days = Column(Integer, default=0, nullable=False)
    description = Column(Text, default="", nullable=False)
    category_id = Column(Integer, ForeignKey("course_categories.id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("course_subcategories.id"), nullable=True)
    test_series_ids = Column(JSON, default=list, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    video_order = Column(String(100), default="Default Sorting", nullable=False)
    thumbnail_url = Column(String(1024), default="", nullable=False)
    syllabus_url = Column(String(1024), default="", nullable=False)
    telegram_paid = Column(String(500), default="", nullable=False)
    telegram_free = Column(String(500), default="", nullable=False)
    whatsapp = Column(String(100), default="", nullable=False)
    show_in_app = Column(Boolean, default=True, nullable=False)
    drip_content = Column(Boolean, default=False, nullable=False)
    sequential_learning = Column(Boolean, default=False, nullable=False)
    block_payment = Column(Boolean, default=False, nullable=False)
    max_validity = Column(Date, nullable=True)
    teacher_ids = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), default="", nullable=False)
    city = Column(String(255), default="", nullable=False)
    state = Column(String(255), default="", nullable=False)
    signup_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    # List of enrolled course ids (JSON, Postgres-compatible).
    course_ids = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String(255), nullable=False)
    contact = Column(String(50), default="", nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    transaction_id = Column(String(255), default="", nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    items = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False, index=True)
    company_name = Column(String(255), default="", nullable=False)
    email = Column(String(255), default="", nullable=False)
    phone = Column(String(50), default="", nullable=False)
    support_technical = Column(String(255), default="", nullable=False)
    support_general = Column(String(255), default="", nullable=False)
    support_billing = Column(String(255), default="", nullable=False)
    headquarters = Column(String(255), default="", nullable=False)
    website = Column(String(500), default="", nullable=False)
    whatsapp = Column(String(100), default="", nullable=False)
    instagram = Column(String(500), default="", nullable=False)
    youtube = Column(String(500), default="", nullable=False)
    gst_rate = Column(Float, default=0.0, nullable=False)
    gstin = Column(String(100), default="", nullable=False)
    about_us = Column(Text, default="", nullable=False)
    privacy_policy = Column(Text, default="", nullable=False)
    refund_policy = Column(Text, default="", nullable=False)
    terms = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ---------- Phase 2 ----------
class TestSeries(Base):
    __tablename__ = "test_series"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="", nullable=False)
    category = Column(String(255), default="", nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    validity_days = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    test_series_id = Column(Integer, ForeignKey("test_series.id"), nullable=False, index=True)
    chapter_test = Column(String(255), default="", nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(1024), default="", nullable=False)
    option_b = Column(String(1024), default="", nullable=False)
    option_c = Column(String(1024), default="", nullable=False)
    option_d = Column(String(1024), default="", nullable=False)
    correct_option = Column(String(10), default="A", nullable=False)
    marks = Column(Float, default=1.0, nullable=False)
    negative_marks = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class VideoAssignment(Base):
    __tablename__ = "video_assignments"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    video_url = Column(String(1024), default="", nullable=False)
    description = Column(Text, default="", nullable=False)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("video_assignments.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    file_url = Column(String(1024), default="", nullable=False)
    text = Column(Text, default="", nullable=False)
    marks = Column(Float, nullable=True)
    feedback = Column(Text, default="", nullable=False)
    status = Column(String(50), default="SUBMITTED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class TestAssignment(Base):
    __tablename__ = "test_assignments"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    test_series_id = Column(Integer, ForeignKey("test_series.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class StudentTestAssignment(Base):
    __tablename__ = "student_test_assignments"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    test_assignment_id = Column(Integer, ForeignKey("test_assignments.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    score = Column(Float, default=0.0, nullable=False)
    total_marks = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="ASSIGNED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    test_series_id = Column(Integer, ForeignKey("test_series.id"), nullable=True)
    chapter_test = Column(String(255), default="", nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    total_marks = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    folder = Column(String(255), default="", nullable=False)
    kind = Column(String(50), default="note", nullable=False)
    file_url = Column(String(1024), default="", nullable=False)
    description = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ExamType(Base):
    __tablename__ = "exam_types"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PreviousPaper(Base):
    __tablename__ = "previous_papers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    exam_type_id = Column(Integer, ForeignKey("exam_types.id"), nullable=True)
    year = Column(Integer, nullable=True)
    file_url = Column(String(1024), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EbookType(Base):
    __tablename__ = "ebook_types"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Author(Base):
    __tablename__ = "authors"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    bio = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Ebook(Base):
    __tablename__ = "ebooks"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=True)
    ebook_type_id = Column(Integer, ForeignKey("ebook_types.id"), nullable=True)
    price = Column(Float, default=0.0, nullable=False)
    file_url = Column(String(1024), default="", nullable=False)
    cover_url = Column(String(1024), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EbookBanner(Base):
    __tablename__ = "ebook_banners"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    image_url = Column(String(1024), default="", nullable=False)
    weight = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Seminar(Base):
    __tablename__ = "seminars"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="", nullable=False)
    category = Column(String(255), default="", nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    meeting_url = Column(String(1024), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Bundle(Base):
    __tablename__ = "bundles"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    course_ids = Column(JSON, default=list, nullable=False)
    test_series_ids = Column(JSON, default=list, nullable=False)
    ebook_ids = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class YoutubeVideo(Base):
    __tablename__ = "youtube_videos"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    video_id = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    category = Column(String(255), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), default="", nullable=False)
    email = Column(String(255), default="", nullable=False)
    source = Column(String(255), default="", nullable=False)
    type = Column(String(50), default="custom", nullable=False)
    status = Column(String(50), default="NEW", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Testimonial(Base):
    __tablename__ = "testimonials"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    text = Column(Text, default="", nullable=False)
    rating = Column(Integer, default=5, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Topper(Base):
    __tablename__ = "toppers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String(255), nullable=False)
    exam = Column(String(255), default="", nullable=False)
    rank = Column(Integer, default=0, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Banner(Base):
    __tablename__ = "banners"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    image_url = Column(String(1024), default="", nullable=False)
    banner_type = Column(String(100), default="", nullable=False)
    redirection_type = Column(String(100), default="", nullable=False)
    redirection_value = Column(String(1024), default="", nullable=False)
    placement = Column(String(100), default="", nullable=False)
    weight = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    popup = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    body = Column(Text, default="", nullable=False)
    audience = Column(String(255), default="ALL", nullable=False)
    status = Column(String(50), default="SENT", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CurrentAffair(Base):
    __tablename__ = "current_affairs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    language = Column(String(50), default="en", nullable=False)
    content = Column(Text, default="", nullable=False)
    published_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    thumbnail_url = Column(String(1024), default="", nullable=False)
    description = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    discount_percent = Column(Float, default=0.0, nullable=False)
    max_discount = Column(Float, default=0.0, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AppliedCoupon(Base):
    __tablename__ = "applied_coupons"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OtpUsage(Base):
    __tablename__ = "otp_usage"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    otp = Column(String(20), nullable=False)
    mobile = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EnquiryType(Base):
    __tablename__ = "enquiry_types"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Enquiry(Base):
    __tablename__ = "enquiries"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), default="", nullable=False)
    phone = Column(String(20), default="", nullable=False)
    message = Column(Text, default="", nullable=False)
    enquiry_type_id = Column(Integer, ForeignKey("enquiry_types.id"), nullable=True)
    status = Column(String(50), default="NEW", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CourseLog(Base):
    __tablename__ = "course_logs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    course_title = Column(String(500), default="", nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    details = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ---------- Phase 4: payments, AI, integration logs ----------
class PaymentTransaction(Base):
    """Cashfree payment transaction. amount is stored in paise (integer)."""
    __tablename__ = "payment_transactions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    order_id = Column(String(100), unique=True, nullable=False, index=True)
    cashfree_order_id = Column(String(255), default="", nullable=False)
    item_type = Column(String(50), nullable=False)  # course|bundle|wallet|storage
    item_id = Column(Integer, nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    amount = Column(Integer, default=0, nullable=False)  # paise
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(20), default="PENDING", nullable=False)  # PENDING|PAID|FAILED
    payment_session_id = Column(String(1024), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AIGeneration(Base):
    __tablename__ = "ai_generations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    source_filename = Column(String(500), default="", nullable=False)
    topic = Column(String(500), default="", nullable=False)
    class_name = Column(String(255), default="", nullable=False)
    difficulty = Column(String(50), default="medium", nullable=False)
    count = Column(Integer, default=0, nullable=False)
    draft_json = Column(JSON, default=list, nullable=False)
    status = Column(String(20), default="draft", nullable=False)  # draft|saved
    test_series_id = Column(Integer, ForeignKey("test_series.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class IntegrationLog(Base):
    __tablename__ = "integration_logs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    channel = Column(String(50), nullable=False)  # whatsapp|push|sms
    recipient = Column(String(255), default="", nullable=False)
    template_name = Column(String(255), default="", nullable=False)
    status = Column(String(20), default="sent", nullable=False)  # sent|failed|not_configured
    detail = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

