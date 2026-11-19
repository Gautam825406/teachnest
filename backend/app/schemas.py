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


# ---------- Phase 2 ----------

class TestSeriesBase(BaseModel):
    title: str
    description: str = ""
    category: str = ""
    price: float = 0
    validity_days: int = 0
    is_active: bool = True


class TestSeriesCreate(TestSeriesBase):
    pass


class TestSeriesUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    price: float | None = None
    validity_days: int | None = None
    is_active: bool | None = None


class TestSeriesOut(TestSeriesBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTestSeriess(BaseModel):
    items: list[TestSeriesOut]
    total: int

class QuestionBase(BaseModel):
    chapter_test: str = ""
    question_text: str
    option_a: str = ""
    option_b: str = ""
    option_c: str = ""
    option_d: str = ""
    correct_option: str = "A"
    marks: float = 1.0
    negative_marks: float = 0


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    chapter_test: str | None = None
    question_text: str | None = None
    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    correct_option: str | None = None
    marks: float | None = None
    negative_marks: float | None = None


class QuestionOut(QuestionBase):
    id: int
    created_at: datetime
    test_series_id: int

    model_config = {"from_attributes": True}


class PaginatedQuestions(BaseModel):
    items: list[QuestionOut]
    total: int

class VideoAssignmentBase(BaseModel):
    title: str
    course_id: int | None = None
    video_url: str = ""
    description: str = ""
    due_date: date | None = None


class VideoAssignmentCreate(VideoAssignmentBase):
    pass


class VideoAssignmentUpdate(BaseModel):
    title: str | None = None
    course_id: int | None | None = None
    video_url: str | None = None
    description: str | None = None
    due_date: date | None | None = None


class VideoAssignmentOut(VideoAssignmentBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedVideoAssignments(BaseModel):
    items: list[VideoAssignmentOut]
    total: int

class SubmissionBase(BaseModel):
    assignment_id: int
    student_id: int | None = None
    file_url: str = ""
    text: str = ""
    marks: float | None = None
    feedback: str = ""
    status: str = "SUBMITTED"


class SubmissionCreate(SubmissionBase):
    pass


class SubmissionUpdate(BaseModel):
    assignment_id: int | None = None
    student_id: int | None | None = None
    file_url: str | None = None
    text: str | None = None
    marks: float | None | None = None
    feedback: str | None = None
    status: str | None = None


class SubmissionOut(SubmissionBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedSubmissions(BaseModel):
    items: list[SubmissionOut]
    total: int

class TestAssignmentBase(BaseModel):
    title: str
    test_series_id: int | None = None
    student_id: int | None = None
    due_date: date | None = None


class TestAssignmentCreate(TestAssignmentBase):
    pass


class TestAssignmentUpdate(BaseModel):
    title: str | None = None
    test_series_id: int | None | None = None
    student_id: int | None | None = None
    due_date: date | None | None = None


class TestAssignmentOut(TestAssignmentBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTestAssignments(BaseModel):
    items: list[TestAssignmentOut]
    total: int

class StudentTestAssignmentBase(BaseModel):
    test_assignment_id: int
    student_id: int | None = None
    score: float = 0
    total_marks: float = 0
    status: str = "ASSIGNED"


class StudentTestAssignmentCreate(StudentTestAssignmentBase):
    pass


class StudentTestAssignmentUpdate(BaseModel):
    test_assignment_id: int | None = None
    student_id: int | None | None = None
    score: float | None = None
    total_marks: float | None = None
    status: str | None = None


class StudentTestAssignmentOut(StudentTestAssignmentBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedStudentTestAssignments(BaseModel):
    items: list[StudentTestAssignmentOut]
    total: int

class ScoreBase(BaseModel):
    student_id: int | None = None
    test_series_id: int | None = None
    chapter_test: str = ""
    score: float = 0
    total_marks: float = 0


class ScoreCreate(ScoreBase):
    pass


class ScoreUpdate(BaseModel):
    student_id: int | None | None = None
    test_series_id: int | None | None = None
    chapter_test: str | None = None
    score: float | None = None
    total_marks: float | None = None


class ScoreOut(ScoreBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedScores(BaseModel):
    items: list[ScoreOut]
    total: int

class NoteBase(BaseModel):
    title: str
    folder: str = ""
    kind: str = "note"
    file_url: str = ""
    description: str = ""
    @field_validator("kind")
    @classmethod
    def kind_valid(cls, v: str) -> str:
        if v not in ("note", "folder", "syllabus", "uploaded"):
            raise ValueError("kind must be note|folder|syllabus|uploaded")
        return v


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: str | None = None
    folder: str | None = None
    kind: str | None = None
    file_url: str | None = None
    description: str | None = None


class NoteOut(NoteBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedNotes(BaseModel):
    items: list[NoteOut]
    total: int

class ExamTypeBase(BaseModel):
    name: str


class ExamTypeCreate(ExamTypeBase):
    pass


class ExamTypeUpdate(BaseModel):
    name: str | None = None


class ExamTypeOut(ExamTypeBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedExamTypes(BaseModel):
    items: list[ExamTypeOut]
    total: int

class PreviousPaperBase(BaseModel):
    title: str
    exam_type_id: int | None = None
    year: int | None = None
    file_url: str = ""


class PreviousPaperCreate(PreviousPaperBase):
    pass


class PreviousPaperUpdate(BaseModel):
    title: str | None = None
    exam_type_id: int | None | None = None
    year: int | None | None = None
    file_url: str | None = None


class PreviousPaperOut(PreviousPaperBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPreviousPapers(BaseModel):
    items: list[PreviousPaperOut]
    total: int

class EbookTypeBase(BaseModel):
    name: str


class EbookTypeCreate(EbookTypeBase):
    pass


class EbookTypeUpdate(BaseModel):
    name: str | None = None


class EbookTypeOut(EbookTypeBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEbookTypes(BaseModel):
    items: list[EbookTypeOut]
    total: int

class AuthorBase(BaseModel):
    name: str
    bio: str = ""


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None


class AuthorOut(AuthorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAuthors(BaseModel):
    items: list[AuthorOut]
    total: int

class EbookBase(BaseModel):
    title: str
    author_id: int | None = None
    ebook_type_id: int | None = None
    price: float = 0
    file_url: str = ""
    cover_url: str = ""


class EbookCreate(EbookBase):
    pass


class EbookUpdate(BaseModel):
    title: str | None = None
    author_id: int | None | None = None
    ebook_type_id: int | None | None = None
    price: float | None = None
    file_url: str | None = None
    cover_url: str | None = None


class EbookOut(EbookBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEbooks(BaseModel):
    items: list[EbookOut]
    total: int

class EbookBannerBase(BaseModel):
    title: str
    image_url: str = ""
    weight: int = 0
    status: str = "ACTIVE"


class EbookBannerCreate(EbookBannerBase):
    pass


class EbookBannerUpdate(BaseModel):
    title: str | None = None
    image_url: str | None = None
    weight: int | None = None
    status: str | None = None


class EbookBannerOut(EbookBannerBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEbookBanners(BaseModel):
    items: list[EbookBannerOut]
    total: int

class SeminarBase(BaseModel):
    title: str
    description: str = ""
    category: str = ""
    scheduled_at: datetime | None = None
    meeting_url: str = ""


class SeminarCreate(SeminarBase):
    pass


class SeminarUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    scheduled_at: datetime | None | None = None
    meeting_url: str | None = None


class SeminarOut(SeminarBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedSeminars(BaseModel):
    items: list[SeminarOut]
    total: int

class BundleBase(BaseModel):
    name: str
    description: str = ""
    price: float = 0
    course_ids: list[int] = []
    test_series_ids: list[int] = []
    ebook_ids: list[int] = []


class BundleCreate(BundleBase):
    pass


class BundleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    course_ids: list[int] | None = None
    test_series_ids: list[int] | None = None
    ebook_ids: list[int] | None = None


class BundleOut(BundleBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedBundles(BaseModel):
    items: list[BundleOut]
    total: int

class YoutubeVideoBase(BaseModel):
    video_id: str
    title: str
    category: str = ""


class YoutubeVideoCreate(YoutubeVideoBase):
    pass


class YoutubeVideoUpdate(BaseModel):
    video_id: str | None = None
    title: str | None = None
    category: str | None = None


class YoutubeVideoOut(YoutubeVideoBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedYoutubeVideos(BaseModel):
    items: list[YoutubeVideoOut]
    total: int

class LeadBase(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    source: str = ""
    type: str = "custom"
    status: str = "NEW"
    @field_validator("type")
    @classmethod
    def type_valid(cls, v: str) -> str:
        if v not in ("custom", "signup", "expired"):
            raise ValueError("type must be custom|signup|expired")
        return v


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    source: str | None = None
    type: str | None = None
    status: str | None = None


class LeadOut(LeadBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedLeads(BaseModel):
    items: list[LeadOut]
    total: int

class TestimonialBase(BaseModel):
    student_name: str
    text: str = ""
    rating: int = 5


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    student_name: str | None = None
    text: str | None = None
    rating: int | None = None


class TestimonialOut(TestimonialBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTestimonials(BaseModel):
    items: list[TestimonialOut]
    total: int

class TopperBase(BaseModel):
    student_id: int | None = None
    student_name: str
    exam: str = ""
    rank: int = 0
    score: float = 0


class TopperCreate(TopperBase):
    pass


class TopperUpdate(BaseModel):
    student_id: int | None | None = None
    student_name: str | None = None
    exam: str | None = None
    rank: int | None = None
    score: float | None = None


class TopperOut(TopperBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedToppers(BaseModel):
    items: list[TopperOut]
    total: int

class BannerBase(BaseModel):
    name: str
    image_url: str = ""
    banner_type: str = ""
    redirection_type: str = ""
    redirection_value: str = ""
    placement: str = ""
    weight: int = 0
    status: str = "ACTIVE"
    popup: bool = False


class BannerCreate(BannerBase):
    pass


class BannerUpdate(BaseModel):
    name: str | None = None
    image_url: str | None = None
    banner_type: str | None = None
    redirection_type: str | None = None
    redirection_value: str | None = None
    placement: str | None = None
    weight: int | None = None
    status: str | None = None
    popup: bool | None = None


class BannerOut(BannerBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedBanners(BaseModel):
    items: list[BannerOut]
    total: int

class NotificationBase(BaseModel):
    title: str
    body: str = ""
    audience: str = "ALL"
    status: str = "SENT"


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    audience: str | None = None
    status: str | None = None


class NotificationOut(NotificationBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedNotifications(BaseModel):
    items: list[NotificationOut]
    total: int

class CurrentAffairBase(BaseModel):
    title: str
    language: str = "en"
    content: str = ""
    published_date: date | None = None


class CurrentAffairCreate(CurrentAffairBase):
    pass


class CurrentAffairUpdate(BaseModel):
    title: str | None = None
    language: str | None = None
    content: str | None = None
    published_date: date | None | None = None


class CurrentAffairOut(CurrentAffairBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCurrentAffairs(BaseModel):
    items: list[CurrentAffairOut]
    total: int

class JobBase(BaseModel):
    title: str
    thumbnail_url: str = ""
    description: str = ""


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: str | None = None
    thumbnail_url: str | None = None
    description: str | None = None


class JobOut(JobBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedJobs(BaseModel):
    items: list[JobOut]
    total: int

class CouponBase(BaseModel):
    code: str
    discount_percent: float = 0
    max_discount: float = 0
    valid_from: date | None = None
    valid_to: date | None = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    code: str | None = None
    discount_percent: float | None = None
    max_discount: float | None = None
    valid_from: date | None | None = None
    valid_to: date | None | None = None
    is_active: bool | None = None


class CouponOut(CouponBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCoupons(BaseModel):
    items: list[CouponOut]
    total: int

class AppliedCouponBase(BaseModel):
    coupon_id: int
    student_id: int | None = None
    order_id: int | None = None


class AppliedCouponCreate(AppliedCouponBase):
    pass


class AppliedCouponUpdate(BaseModel):
    coupon_id: int | None = None
    student_id: int | None | None = None
    order_id: int | None | None = None


class AppliedCouponOut(AppliedCouponBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAppliedCoupons(BaseModel):
    items: list[AppliedCouponOut]
    total: int

class OtpUsageBase(BaseModel):
    otp: str
    mobile: str


class OtpUsageCreate(OtpUsageBase):
    pass


class OtpUsageUpdate(BaseModel):
    otp: str | None = None
    mobile: str | None = None


class OtpUsageOut(OtpUsageBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedOtpUsages(BaseModel):
    items: list[OtpUsageOut]
    total: int

class EnquiryTypeBase(BaseModel):
    name: str


class EnquiryTypeCreate(EnquiryTypeBase):
    pass


class EnquiryTypeUpdate(BaseModel):
    name: str | None = None


class EnquiryTypeOut(EnquiryTypeBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEnquiryTypes(BaseModel):
    items: list[EnquiryTypeOut]
    total: int

class EnquiryBase(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    message: str = ""
    enquiry_type_id: int | None = None
    status: str = "NEW"


class EnquiryCreate(EnquiryBase):
    pass


class EnquiryUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    message: str | None = None
    enquiry_type_id: int | None | None = None
    status: str | None = None


class EnquiryOut(EnquiryBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEnquirys(BaseModel):
    items: list[EnquiryOut]
    total: int

class CourseLogBase(BaseModel):
    action: str
    course_id: int | None = None
    course_title: str = ""
    user_id: int | None = None
    details: str = ""


class CourseLogCreate(CourseLogBase):
    pass


class CourseLogUpdate(BaseModel):
    action: str | None = None
    course_id: int | None | None = None
    course_title: str | None = None
    user_id: int | None | None = None
    details: str | None = None


class CourseLogOut(CourseLogBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCourseLogs(BaseModel):
    items: list[CourseLogOut]
    total: int

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    email: str
    password: str = Field(..., min_length=6)
    role: str = "Teacher"

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return _email_is_plausible(v)


class UserListOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadOut(BaseModel):
    url: str
    filename: str
    size_bytes: int
    content_type: str


class ScoreSheetStudent(BaseModel):
    student_id: int | None
    student_name: str
    score: float
    total_marks: float


class ScoreSheetOut(BaseModel):
    students: list[ScoreSheetStudent]


class TopperCallOut(BaseModel):
    id: int
    student_id: int | None
    student_name: str
    exam: str
    rank: int
    score: float
    phone: str = ""

    model_config = {"from_attributes": True}


class IntegrationOut(BaseModel):
    provider: str
    name: str
    status: str
    badge: str
    category: str
    description: str


class OrderTransferRequest(BaseModel):
    to_student_id: int


class OrderRefundRequest(BaseModel):
    reason: str = ""



class PaginatedUsers(BaseModel):
    items: list[UserListOut]
    total: int
