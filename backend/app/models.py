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
