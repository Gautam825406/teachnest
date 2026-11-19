from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from .permissions import PERMISSIONS


def _email_is_plausible(v: str) -> str:
    # Plain check (not EmailStr): EmailStr/email-validator rejects
    # special-use domains such as .local, which the demo seed uses.
    if "@" not in v or "." not in v.split("@", 1)[1]:
        raise ValueError("invalid email address")
    return v


# ---------- Auth ----------
class SignupRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=3)
    email: str
    password: str = Field(..., min_length=6)

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return _email_is_plausible(v)


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    tenant_id: int
    tenant_name: str
    org_code: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Courses ----------
class CourseBase(BaseModel):
    title: str
    mrp: float = 0
    price: float = 0
    validity_days: int = 0
    description: str = ""
    category_id: int | None = None
    subcategory_id: int | None = None
    test_series_ids: list[int] = []
    position: int = 0
    video_order: str = "Default Sorting"
    thumbnail_url: str = ""
    syllabus_url: str = ""
    telegram_paid: str = ""
    telegram_free: str = ""
    whatsapp: str = ""
    show_in_app: bool = True
    drip_content: bool = False
    sequential_learning: bool = False
    block_payment: bool = False
    max_validity: date | None = None
    teacher_ids: list[int] = []


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: str | None = None
    mrp: float | None = None
    price: float | None = None
    validity_days: int | None = None
    description: str | None = None
    category_id: int | None = None
    subcategory_id: int | None = None
    test_series_ids: list[int] | None = None
    position: int | None = None
    video_order: str | None = None
    thumbnail_url: str | None = None
    syllabus_url: str | None = None
    telegram_paid: str | None = None
    telegram_free: str | None = None
    whatsapp: str | None = None
    show_in_app: bool | None = None
    drip_content: bool | None = None
    sequential_learning: bool | None = None
    block_payment: bool | None = None
    max_validity: date | None = None
    teacher_ids: list[int] | None = None


class CourseOut(CourseBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCourses(BaseModel):
    items: list[CourseOut]
    total: int


# ---------- Categories ----------
class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    model_config = {"from_attributes": True}


class SubcategoryBase(BaseModel):
    name: str
    category_id: int


class SubcategoryCreate(SubcategoryBase):
    pass


class SubcategoryOut(SubcategoryBase):
    id: int

    model_config = {"from_attributes": True}


# ---------- Teachers ----------
class TeacherBase(BaseModel):
    name: str
    subject: str
    email: str
    phone: str
    experience_years: int = 0
    display_weight: int = 0
    tagline: str = ""
    quote: str = ""
    categories: list[str] = []
    biography: str = ""
    photo_url: str = ""
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return _email_is_plausible(v)

    @field_validator("phone")
    @classmethod
    def phone_must_be_10_digits(cls, v: str) -> str:
        if not (isinstance(v, str) and v.isdigit() and len(v) == 10):
            raise ValueError("phone must be exactly 10 digits")
        return v


class TeacherCreate(TeacherBase):
    pass


class TeacherUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    email: str | None = None
    phone: str | None = None
    experience_years: int | None = None
    display_weight: int | None = None
    tagline: str | None = None
    quote: str | None = None
    categories: list[str] | None = None
    biography: str | None = None
    photo_url: str | None = None
    is_active: bool | None = None

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str | None) -> str | None:
        return None if v is None else _email_is_plausible(v)

    @field_validator("phone")
    @classmethod
    def phone_must_be_10_digits(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not (v.isdigit() and len(v) == 10):
            raise ValueError("phone must be exactly 10 digits")
        return v


class TeacherOut(TeacherBase):
    id: int

    model_config = {"from_attributes": True}


# ---------- Students ----------
class StudentOut(BaseModel):
    id: int
    name: str
    phone: str | None = None  # full phone only on detail; None/absent in list
    masked_phone: str
    email: str
    city: str
    state: str
    signup_date: datetime
    courses: list = []


class PaginatedStudents(BaseModel):
    items: list[StudentOut]
    total: int


def mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) >= 10:
        return f"+91 *****{digits[-5:]}"
    if digits:
        return f"***** {digits[-5:]}" if len(digits) > 5 else "*****"
    return ""


# ---------- Orders ----------
class OrderOut(BaseModel):
    id: int
    student_id: int | None
    student_name: str
    contact: str
    status: str
    transaction_id: str
    amount: float
    items: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedOrders(BaseModel):
    items: list[OrderOut]
    total: int


# ---------- Roles ----------
class RoleBase(BaseModel):
    name: str
    is_system_default: bool = False
    permissions: list[str] = []

    @field_validator("permissions")
    @classmethod
    def permissions_must_be_known(cls, v: list[str]) -> list[str]:
        unknown = [p for p in v if p not in PERMISSIONS]
        if unknown:
            raise ValueError(f"Unknown permissions: {', '.join(unknown)}")
        return v


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: str | None = None
    is_system_default: bool | None = None
    permissions: list[str] | None = None

    @field_validator("permissions")
    @classmethod
    def permissions_must_be_known(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        unknown = [p for p in v if p not in PERMISSIONS]
        if unknown:
            raise ValueError(f"Unknown permissions: {', '.join(unknown)}")
        return v


class RoleOut(RoleBase):
    id: int

    model_config = {"from_attributes": True}


# ---------- Settings ----------
class SettingsOut(BaseModel):
    company_name: str = ""
    email: str = ""
    phone: str = ""
    support_technical: str = ""
    support_general: str = ""
    support_billing: str = ""
    headquarters: str = ""
    website: str = ""
    whatsapp: str = ""
    instagram: str = ""
    youtube: str = ""
    gst_rate: float = 0
    gstin: str = ""
    about_us: str = ""
    privacy_policy: str = ""
    refund_policy: str = ""
    terms: str = ""

    model_config = {"from_attributes": True}


class SettingsUpdate(SettingsOut):
    pass


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    todays_earnings: float
    recently_joined: int
    total_earnings: float
    total_classes_taken: int
    total_courses: int
    total_students: int
    total_teachers: int
    total_orders: int
    video_storage_mb: float
    video_storage_limit_gb: float
    storage_plan: str
    wallet_balance: float
    payment_gateway: dict
