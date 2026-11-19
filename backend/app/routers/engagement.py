"""Engagement modules (Phase 2 #12-#15, #17-#20, #22, #23): leads, testimonials, toppers, banners, notifications, coupons, OTP usage, enquiries, integrations, users, course logs."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import AppliedCoupon, Banner, Coupon, CourseLog, Enquiry, EnquiryType, Lead, Notification, OtpUsage, Student, Testimonial, Topper, User
from ..schemas import AppliedCouponOut, BannerCreate, BannerOut, BannerUpdate, PaginatedBanners, CouponCreate, CouponOut, CouponUpdate, PaginatedCoupons, EnquiryCreate, EnquiryOut, EnquiryUpdate, PaginatedEnquirys, EnquiryTypeCreate, EnquiryTypeOut, EnquiryTypeUpdate, PaginatedEnquiryTypes, IntegrationOut, LeadCreate, LeadOut, LeadUpdate, PaginatedLeads, NotificationCreate, NotificationOut, NotificationUpdate, PaginatedNotifications, PaginatedAppliedCoupons, PaginatedCourseLogs, PaginatedOtpUsages, PaginatedUsers, TestimonialCreate, TestimonialOut, TestimonialUpdate, PaginatedTestimonials, TopperCallOut, TopperCreate, TopperOut, TopperUpdate, PaginatedToppers, UserCreate, UserListOut
from ..security import hash_password

router = APIRouter(tags=["engagement"])

def _or_404(db, model, tenant_id, obj_id, label):
    obj = db.query(model).filter(model.id == obj_id, model.tenant_id == tenant_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj

def _list(q, page, per_page, order):
    total = q.count()
    items = q.order_by(order).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}

# ---------- Lead ----------
@router.get("/leads", response_model=PaginatedLeads)
def list_leads(search: str | None = None, type: str | None = None, status: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Lead).filter(Lead.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Lead.name.ilike(f"%{search}%"))
    if type:
        q = q.filter(Lead.type == type)
    if status:
        q = q.filter(Lead.status == status)
    return _list(q, page, per_page, Lead.id.desc())

@router.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Lead(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/leads/{oid}", response_model=LeadOut)
def get_lead(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Lead, user.tenant_id, oid, "Lead")

@router.put("/leads/{oid}", response_model=LeadOut)
def update_lead(oid: int, payload: LeadUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Lead, user.tenant_id, oid, "Lead")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/leads/{oid}", status_code=204)
def delete_lead(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Lead, user.tenant_id, oid, "Lead")
    db.delete(obj); db.commit()
    return None

# ---------- Testimonial ----------
@router.get("/testimonials", response_model=PaginatedTestimonials)
def list_testimonials(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Testimonial).filter(Testimonial.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Testimonial.student_name.ilike(f"%{search}%"))
    return _list(q, page, per_page, Testimonial.id.desc())

@router.post("/testimonials", response_model=TestimonialOut, status_code=201)
def create_testimonial(payload: TestimonialCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Testimonial(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/testimonials/{oid}", response_model=TestimonialOut)
def get_testimonial(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Testimonial, user.tenant_id, oid, "Testimonial")

@router.put("/testimonials/{oid}", response_model=TestimonialOut)
def update_testimonial(oid: int, payload: TestimonialUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Testimonial, user.tenant_id, oid, "Testimonial")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/testimonials/{oid}", status_code=204)
def delete_testimonial(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Testimonial, user.tenant_id, oid, "Testimonial")
    db.delete(obj); db.commit()
    return None

# ---------- Topper ----------
@router.get("/toppers/call-list", response_model=list[TopperCallOut])
def toppers_call_list(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = []
    for t in db.query(Topper).filter(Topper.tenant_id == user.tenant_id).order_by(Topper.rank, Topper.id).all():
        stu = db.query(Student).filter(Student.id == t.student_id, Student.tenant_id == user.tenant_id).first() if t.student_id else None
        rows.append({"id": t.id, "student_id": t.student_id, "student_name": t.student_name, "exam": t.exam, "rank": t.rank, "score": t.score, "phone": stu.phone if stu else ""})
    return rows

@router.get("/toppers", response_model=PaginatedToppers)
def list_toppers(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Topper).filter(Topper.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Topper.student_name.ilike(f"%{search}%"))
    return _list(q, page, per_page, Topper.id.desc())

@router.post("/toppers", response_model=TopperOut, status_code=201)
def create_topper(payload: TopperCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Topper(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/toppers/{oid}", response_model=TopperOut)
def get_topper(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Topper, user.tenant_id, oid, "Topper")

@router.put("/toppers/{oid}", response_model=TopperOut)
def update_topper(oid: int, payload: TopperUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Topper, user.tenant_id, oid, "Topper")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/toppers/{oid}", status_code=204)
def delete_topper(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Topper, user.tenant_id, oid, "Topper")
    db.delete(obj); db.commit()
    return None

# ---------- Banner ----------
@router.get("/banners", response_model=PaginatedBanners)
def list_banners(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Banner).filter(Banner.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Banner.name.ilike(f"%{search}%"))
    return _list(q, page, per_page, Banner.id.desc())

@router.post("/banners", response_model=BannerOut, status_code=201)
def create_banner(payload: BannerCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Banner(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/banners/{oid}", response_model=BannerOut)
def get_banner(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Banner, user.tenant_id, oid, "Banner")

@router.put("/banners/{oid}", response_model=BannerOut)
def update_banner(oid: int, payload: BannerUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Banner, user.tenant_id, oid, "Banner")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/banners/{oid}", status_code=204)
def delete_banner(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Banner, user.tenant_id, oid, "Banner")
    db.delete(obj); db.commit()
    return None

# ---------- Notification ----------
@router.get("/notifications", response_model=PaginatedNotifications)
def list_notifications(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Notification.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, Notification.id.desc())

@router.post("/notifications", response_model=NotificationOut, status_code=201)
def create_notification(payload: NotificationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump(); data['status'] = 'SENT'  # POST = send
    obj = Notification(tenant_id=user.tenant_id, **data)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/notifications/{oid}", response_model=NotificationOut)
def get_notification(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Notification, user.tenant_id, oid, "Notification")

@router.put("/notifications/{oid}", response_model=NotificationOut)
def update_notification(oid: int, payload: NotificationUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Notification, user.tenant_id, oid, "Notification")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/notifications/{oid}", status_code=204)
def delete_notification(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Notification, user.tenant_id, oid, "Notification")
    db.delete(obj); db.commit()
    return None

# ---------- Coupons: applied ----------
@router.get("/coupons/applied", response_model=PaginatedAppliedCoupons)
def list_applied_coupons(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(AppliedCoupon).filter(AppliedCoupon.tenant_id == user.tenant_id)
    return _list(q, page, per_page, AppliedCoupon.id.desc())


# ---------- Coupon ----------
@router.get("/coupons", response_model=PaginatedCoupons)
def list_coupons(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Coupon).filter(Coupon.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Coupon.code.ilike(f"%{search}%"))
    return _list(q, page, per_page, Coupon.id.desc())

@router.post("/coupons", response_model=CouponOut, status_code=201)
def create_coupon(payload: CouponCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Coupon(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/coupons/{oid}", response_model=CouponOut)
def get_coupon(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Coupon, user.tenant_id, oid, "Coupon")

@router.put("/coupons/{oid}", response_model=CouponOut)
def update_coupon(oid: int, payload: CouponUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Coupon, user.tenant_id, oid, "Coupon")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/coupons/{oid}", status_code=204)
def delete_coupon(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Coupon, user.tenant_id, oid, "Coupon")
    db.delete(obj); db.commit()
    return None

# ---------- EnquiryType ----------
@router.get("/enquiry-types", response_model=PaginatedEnquiryTypes)
def list_enquirytypes(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(EnquiryType).filter(EnquiryType.tenant_id == user.tenant_id)
    if search:
        q = q.filter(EnquiryType.name.ilike(f"%{search}%"))
    return _list(q, page, per_page, EnquiryType.id.desc())

@router.post("/enquiry-types", response_model=EnquiryTypeOut, status_code=201)
def create_enquirytype(payload: EnquiryTypeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = EnquiryType(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/enquiry-types/{oid}", response_model=EnquiryTypeOut)
def get_enquirytype(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, EnquiryType, user.tenant_id, oid, "EnquiryType")

@router.put("/enquiry-types/{oid}", response_model=EnquiryTypeOut)
def update_enquirytype(oid: int, payload: EnquiryTypeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, EnquiryType, user.tenant_id, oid, "EnquiryType")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/enquiry-types/{oid}", status_code=204)
def delete_enquirytype(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, EnquiryType, user.tenant_id, oid, "EnquiryType")
    db.delete(obj); db.commit()
    return None

# ---------- Enquiry ----------
@router.get("/enquiries", response_model=PaginatedEnquirys)
def list_enquirys(search: str | None = None, status: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Enquiry).filter(Enquiry.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Enquiry.name.ilike(f"%{search}%"))
    if status:
        q = q.filter(Enquiry.status == status)
    return _list(q, page, per_page, Enquiry.id.desc())

@router.post("/enquiries", response_model=EnquiryOut, status_code=201)
def create_enquiry(payload: EnquiryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Enquiry(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/enquiries/{oid}", response_model=EnquiryOut)
def get_enquiry(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Enquiry, user.tenant_id, oid, "Enquiry")

@router.put("/enquiries/{oid}", response_model=EnquiryOut)
def update_enquiry(oid: int, payload: EnquiryUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Enquiry, user.tenant_id, oid, "Enquiry")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/enquiries/{oid}", status_code=204)
def delete_enquiry(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Enquiry, user.tenant_id, oid, "Enquiry")
    db.delete(obj); db.commit()
    return None

# ---------- OTP usage (read-only) ----------
@router.get("/otp-usage", response_model=PaginatedOtpUsages)
def list_otp_usage(mobile: str | None = None, search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(OtpUsage).filter(OtpUsage.tenant_id == user.tenant_id)
    if mobile:
        q = q.filter(OtpUsage.mobile == mobile)
    if search:
        q = q.filter((OtpUsage.mobile.ilike(f"%{search}%")) | (OtpUsage.otp.ilike(f"%{search}%")))
    return _list(q, page, per_page, OtpUsage.id.desc())


# ---------- Integrations (static demo cards; no real keys, no wiring) ----------
@router.get("/integrations", response_model=list[IntegrationOut])
def list_integrations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ = db
    return [
        {"provider": "whatsapp", "name": "WhatsApp API", "status": "INACTIVE", "badge": "BETA", "category": "NOTIFICATIONS", "description": "Send course updates, reminders and announcements to students over WhatsApp."},
        {"provider": "teachnest-ai", "name": "TeachNest AI", "status": "INACTIVE", "badge": "BETA", "category": "INTELLIGENCE", "description": "AI-assisted content, question generation and student insights for your institute."},
    ]


@router.post("/integrations/{provider}/setup")
def setup_integration(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ = db
    if provider not in ("whatsapp", "teachnest-ai"):
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"status": "INACTIVE", "message": "Setup is not available in this demo \u2014 no real keys are stored."}


# ---------- Users ----------
@router.get("/users", response_model=PaginatedUsers)
def list_users(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(User).filter(User.tenant_id == user.tenant_id)
    if search:
        q = q.filter(User.username.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(User.id).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [UserListOut(id=u.id, username=u.username, email=u.email, role=u.role, created_at=u.created_at) for u in items], "total": total}


@router.post("/users", response_model=UserListOut, status_code=201)
def create_user(payload: UserCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.tenant_id == user.tenant_id, (User.username == payload.username) | (User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists in this tenant")
    obj = User(tenant_id=user.tenant_id, username=payload.username, email=payload.email, password_hash=hash_password(payload.password), role=payload.role)
    db.add(obj); db.commit(); db.refresh(obj)
    return UserListOut(id=obj.id, username=obj.username, email=obj.email, role=obj.role, created_at=obj.created_at)


# ---------- Course logs ----------
@router.get("/course-logs", response_model=PaginatedCourseLogs)
def list_course_logs(course_id: int | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(CourseLog).filter(CourseLog.tenant_id == user.tenant_id)
    if course_id is not None:
        q = q.filter(CourseLog.course_id == course_id)
    return _list(q, page, per_page, CourseLog.id.desc())
