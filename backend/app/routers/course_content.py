"""Course content (Phase 5): subjects, topics, course videos, course
packages, and course copy. Admin API, tenant-scoped like courses.py."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..course_log import log_course_event
from ..database import get_db
from ..deps import get_current_user
from ..models import Course, CoursePackage, CourseVideo, Subject, Topic, User
from ..schemas import (
    CourseCopyRequest,
    CourseOut,
    CoursePackageCreate,
    CoursePackageOut,
    CoursePackageUpdate,
    CourseVideoCreate,
    CourseVideoOut,
    CourseVideoUpdate,
    SubjectCreate,
    SubjectOut,
    SubjectUpdate,
    TopicCreate,
    TopicOut,
    TopicUpdate,
)

router = APIRouter(tags=["course-content"])


def _get_course(db: Session, tenant_id: int, course_id: int) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.tenant_id == tenant_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_subject(db: Session, tenant_id: int, subject_id: int) -> Subject:
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


def _get_topic(db: Session, tenant_id: int, topic_id: int) -> Topic:
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.tenant_id == tenant_id).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


def _get_video(db: Session, tenant_id: int, video_id: int) -> CourseVideo:
    video = db.query(CourseVideo).filter(CourseVideo.id == video_id, CourseVideo.tenant_id == tenant_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


def _get_package(db: Session, tenant_id: int, package_id: int) -> CoursePackage:
    package = db.query(CoursePackage).filter(CoursePackage.id == package_id, CoursePackage.tenant_id == tenant_id).first()
    if package is None:
        raise HTTPException(status_code=404, detail="Course package not found")
    return package


def _validate_course_ids(db: Session, tenant_id: int, course_ids: list[int]) -> None:
    """Every id in course_ids must belong to the tenant's courses (404)."""
    if not course_ids:
        return
    found = {
        c.id
        for c in db.query(Course.id).filter(Course.tenant_id == tenant_id, Course.id.in_(course_ids)).all()
    }
    missing = [cid for cid in course_ids if cid not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"Course not found: {missing[0]}")


def _validate_video_refs(
    db: Session,
    tenant_id: int,
    subject_id: int | None,
    topic_id: int | None,
) -> None:
    subject = None
    if subject_id is not None:
        subject = _get_subject(db, tenant_id, subject_id)
    if topic_id is not None:
        topic = _get_topic(db, tenant_id, topic_id)
        if subject is not None and topic.subject_id != subject.id:
            raise HTTPException(status_code=404, detail="Topic not found")


# ---------- Subjects ----------
@router.get("/courses/{course_id}/subjects", response_model=list[SubjectOut])
def list_subjects(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_course(db, user.tenant_id, course_id)
    return (
        db.query(Subject)
        .filter(Subject.tenant_id == user.tenant_id, Subject.course_id == course.id)
        .order_by(Subject.order, Subject.id)
        .all()
    )


@router.post("/courses/{course_id}/subjects", response_model=SubjectOut, status_code=201)
def create_subject(course_id: int, payload: SubjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_course(db, user.tenant_id, course_id)
    subject = Subject(tenant_id=user.tenant_id, course_id=course.id, **payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/subjects/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_subject(db, user.tenant_id, subject_id)


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, payload: SubjectUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = _get_subject(db, user.tenant_id, subject_id)
    # course_id is not changeable via this endpoint.
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    db.commit()
    db.refresh(subject)
    return subject


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(subject_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = _get_subject(db, user.tenant_id, subject_id)
    # Cascade: delete the subject's topics and all videos under the subject/topics.
    topic_ids = [t.id for t in db.query(Topic).filter(Topic.subject_id == subject.id).all()]
    if topic_ids:
        db.query(CourseVideo).filter(CourseVideo.topic_id.in_(topic_ids)).delete(synchronize_session=False)
    db.query(CourseVideo).filter(CourseVideo.subject_id == subject.id).delete(synchronize_session=False)
    db.query(Topic).filter(Topic.subject_id == subject.id).delete(synchronize_session=False)
    db.delete(subject)
    db.commit()
    return None


# ---------- Topics ----------
@router.get("/subjects/{subject_id}/topics", response_model=list[TopicOut])
def list_topics(subject_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = _get_subject(db, user.tenant_id, subject_id)
    return (
        db.query(Topic)
        .filter(Topic.tenant_id == user.tenant_id, Topic.subject_id == subject.id)
        .order_by(Topic.order, Topic.id)
        .all()
    )


@router.post("/subjects/{subject_id}/topics", response_model=TopicOut, status_code=201)
def create_topic(subject_id: int, payload: TopicCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = _get_subject(db, user.tenant_id, subject_id)
    topic = Topic(tenant_id=user.tenant_id, subject_id=subject.id, **payload.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/topics/{topic_id}", response_model=TopicOut)
def get_topic(topic_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_topic(db, user.tenant_id, topic_id)


@router.put("/topics/{topic_id}", response_model=TopicOut)
def update_topic(topic_id: int, payload: TopicUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    topic = _get_topic(db, user.tenant_id, topic_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}", status_code=204)
def delete_topic(topic_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    topic = _get_topic(db, user.tenant_id, topic_id)
    # Cascade: delete videos under this topic.
    db.query(CourseVideo).filter(CourseVideo.topic_id == topic.id).delete(synchronize_session=False)
    db.delete(topic)
    db.commit()
    return None


# ---------- Course videos ----------
@router.get("/courses/{course_id}/videos", response_model=list[CourseVideoOut])
def list_videos(
    course_id: int,
    subject_id: int | None = None,
    topic_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = _get_course(db, user.tenant_id, course_id)
    q = db.query(CourseVideo).filter(CourseVideo.tenant_id == user.tenant_id, CourseVideo.course_id == course.id)
    if subject_id is not None:
        q = q.filter(CourseVideo.subject_id == subject_id)
    if topic_id is not None:
        q = q.filter(CourseVideo.topic_id == topic_id)
    return q.order_by(CourseVideo.order, CourseVideo.id).all()


@router.post("/courses/{course_id}/videos", response_model=CourseVideoOut, status_code=201)
def create_video(course_id: int, payload: CourseVideoCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_course(db, user.tenant_id, course_id)
    _validate_video_refs(db, user.tenant_id, payload.subject_id, payload.topic_id)
    video = CourseVideo(tenant_id=user.tenant_id, course_id=course.id, **payload.model_dump())
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.get("/course-videos/{video_id}", response_model=CourseVideoOut)
def get_video(video_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_video(db, user.tenant_id, video_id)


@router.put("/course-videos/{video_id}", response_model=CourseVideoOut)
def update_video(video_id: int, payload: CourseVideoUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = _get_video(db, user.tenant_id, video_id)
    data = payload.model_dump(exclude_unset=True)
    subject_id = data.get("subject_id", video.subject_id)
    topic_id = data.get("topic_id", video.topic_id)
    _validate_video_refs(db, user.tenant_id, subject_id, topic_id)
    for field, value in data.items():
        setattr(video, field, value)
    db.commit()
    db.refresh(video)
    return video


@router.delete("/course-videos/{video_id}", status_code=204)
def delete_video(video_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = _get_video(db, user.tenant_id, video_id)
    db.delete(video)
    db.commit()
    return None


# ---------- Course packages ----------
@router.get("/course-packages", response_model=list[CoursePackageOut])
def list_packages(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(CoursePackage)
        .filter(CoursePackage.tenant_id == user.tenant_id)
        .order_by(CoursePackage.id)
        .all()
    )


@router.post("/course-packages", response_model=CoursePackageOut, status_code=201)
def create_package(payload: CoursePackageCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _validate_course_ids(db, user.tenant_id, payload.course_ids)
    package = CoursePackage(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


@router.get("/course-packages/{package_id}", response_model=CoursePackageOut)
def get_package(package_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_package(db, user.tenant_id, package_id)


@router.put("/course-packages/{package_id}", response_model=CoursePackageOut)
def update_package(package_id: int, payload: CoursePackageUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    package = _get_package(db, user.tenant_id, package_id)
    data = payload.model_dump(exclude_unset=True)
    if "course_ids" in data:
        _validate_course_ids(db, user.tenant_id, data["course_ids"])
    for field, value in data.items():
        setattr(package, field, value)
    db.commit()
    db.refresh(package)
    return package


@router.delete("/course-packages/{package_id}", status_code=204)
def delete_package(package_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    package = _get_package(db, user.tenant_id, package_id)
    db.delete(package)
    db.commit()
    return None


# ---------- Course copy ----------
@router.post("/courses/{course_id}/copy", response_model=CourseOut, status_code=201)
def copy_course(course_id: int, payload: CourseCopyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    source = _get_course(db, user.tenant_id, course_id)
    new_title = payload.new_name or f"{source.title} (Copy)"
    new_course = Course(
        tenant_id=user.tenant_id,
        title=new_title,
        mrp=source.mrp,
        price=payload.price if payload.price is not None else source.price,
        validity_days=source.validity_days,
        description=source.description,
        category_id=source.category_id,
        subcategory_id=source.subcategory_id,
        test_series_ids=list(source.test_series_ids or []),
        position=source.position,
        video_order=source.video_order,
        thumbnail_url=source.thumbnail_url,
        syllabus_url=source.syllabus_url,
        telegram_paid=source.telegram_paid,
        telegram_free=source.telegram_free,
        whatsapp=source.whatsapp,
        show_in_app=source.show_in_app,
        drip_content=source.drip_content,
        sequential_learning=source.sequential_learning,
        block_payment=source.block_payment,
        max_validity=source.max_validity,
        teacher_ids=list(source.teacher_ids or []),
    )
    db.add(new_course)
    db.flush()

    subject_map: dict[int, int] = {}
    for subj in (
        db.query(Subject)
        .filter(Subject.tenant_id == user.tenant_id, Subject.course_id == source.id)
        .order_by(Subject.order, Subject.id)
        .all()
    ):
        new_subj = Subject(
            tenant_id=user.tenant_id,
            course_id=new_course.id,
            name=subj.name,
            description=subj.description,
            order=subj.order,
        )
        db.add(new_subj)
        db.flush()
        subject_map[subj.id] = new_subj.id

    topic_map: dict[int, int] = {}
    if subject_map:
        for topic in (
            db.query(Topic)
            .filter(Topic.tenant_id == user.tenant_id, Topic.subject_id.in_(list(subject_map)))
            .order_by(Topic.order, Topic.id)
            .all()
        ):
            new_topic = Topic(
                tenant_id=user.tenant_id,
                subject_id=subject_map[topic.subject_id],
                name=topic.name,
                description=topic.description,
                order=topic.order,
            )
            db.add(new_topic)
            db.flush()
            topic_map[topic.id] = new_topic.id

    for video in (
        db.query(CourseVideo)
        .filter(CourseVideo.tenant_id == user.tenant_id, CourseVideo.course_id == source.id)
        .order_by(CourseVideo.order, CourseVideo.id)
        .all()
    ):
        db.add(CourseVideo(
            tenant_id=user.tenant_id,
            course_id=new_course.id,
            subject_id=subject_map.get(video.subject_id) if video.subject_id is not None else None,
            topic_id=topic_map.get(video.topic_id) if video.topic_id is not None else None,
            title=video.title,
            video_url=video.video_url,
            duration_seconds=video.duration_seconds,
            order=video.order,
            is_free_preview=video.is_free_preview,
        ))
    db.commit()
    db.refresh(new_course)
    log_course_event(
        db, tenant_id=user.tenant_id, action="COURSE_COPIED",
        course_id=new_course.id, course_title=new_course.title, user_id=user.id,
        details=f"Course '{source.title}' (id {source.id}) copied to '{new_course.title}' (id {new_course.id})",
    )
    return new_course
