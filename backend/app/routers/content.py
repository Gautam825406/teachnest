"""Content modules (Phase 2 #6-#11, #16 part): notes, previous papers, e-books, seminars, bundles, YouTube, current affairs, jobs."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Author, Bundle, CurrentAffair, Ebook, EbookBanner, EbookType, ExamType, Job, Note, PreviousPaper, Seminar, User, YoutubeVideo
from ..schemas import AuthorCreate, AuthorOut, AuthorUpdate, PaginatedAuthors, BundleCreate, BundleOut, BundleUpdate, PaginatedBundles, CurrentAffairCreate, CurrentAffairOut, CurrentAffairUpdate, PaginatedCurrentAffairs, EbookBannerCreate, EbookBannerOut, EbookBannerUpdate, PaginatedEbookBanners, EbookCreate, EbookOut, EbookUpdate, PaginatedEbooks, EbookTypeCreate, EbookTypeOut, EbookTypeUpdate, PaginatedEbookTypes, ExamTypeCreate, ExamTypeOut, ExamTypeUpdate, PaginatedExamTypes, JobCreate, JobOut, JobUpdate, PaginatedJobs, NoteCreate, NoteOut, NoteUpdate, PaginatedNotes, PreviousPaperCreate, PreviousPaperOut, PreviousPaperUpdate, PaginatedPreviousPapers, SeminarCreate, SeminarOut, SeminarUpdate, PaginatedSeminars, YoutubeVideoCreate, YoutubeVideoOut, YoutubeVideoUpdate, PaginatedYoutubeVideos

router = APIRouter(tags=["content"])

def _or_404(db, model, tenant_id, obj_id, label):
    obj = db.query(model).filter(model.id == obj_id, model.tenant_id == tenant_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj

def _list(q, page, per_page, order):
    total = q.count()
    items = q.order_by(order).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}

# ---------- Note ----------
@router.get("/notes", response_model=PaginatedNotes)
def list_notes(search: str | None = None, kind: str | None = None, folder: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Note).filter(Note.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Note.title.ilike(f"%{search}%"))
    if kind:
        q = q.filter(Note.kind == kind)
    if folder:
        q = q.filter(Note.folder == folder)
    return _list(q, page, per_page, Note.id.desc())

@router.post("/notes", response_model=NoteOut, status_code=201)
def create_note(payload: NoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Note(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/notes/{oid}", response_model=NoteOut)
def get_note(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Note, user.tenant_id, oid, "Note")

@router.put("/notes/{oid}", response_model=NoteOut)
def update_note(oid: int, payload: NoteUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Note, user.tenant_id, oid, "Note")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/notes/{oid}", status_code=204)
def delete_note(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Note, user.tenant_id, oid, "Note")
    db.delete(obj); db.commit()
    return None

# ---------- ExamType ----------
@router.get("/exam-types", response_model=PaginatedExamTypes)
def list_examtypes(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(ExamType).filter(ExamType.tenant_id == user.tenant_id)
    if search:
        q = q.filter(ExamType.name.ilike(f"%{search}%"))
    return _list(q, page, per_page, ExamType.id.desc())

@router.post("/exam-types", response_model=ExamTypeOut, status_code=201)
def create_examtype(payload: ExamTypeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = ExamType(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/exam-types/{oid}", response_model=ExamTypeOut)
def get_examtype(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, ExamType, user.tenant_id, oid, "ExamType")

@router.put("/exam-types/{oid}", response_model=ExamTypeOut)
def update_examtype(oid: int, payload: ExamTypeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, ExamType, user.tenant_id, oid, "ExamType")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/exam-types/{oid}", status_code=204)
def delete_examtype(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, ExamType, user.tenant_id, oid, "ExamType")
    db.delete(obj); db.commit()
    return None

# ---------- PreviousPaper ----------
@router.get("/previous-papers", response_model=PaginatedPreviousPapers)
def list_previouspapers(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(PreviousPaper).filter(PreviousPaper.tenant_id == user.tenant_id)
    if search:
        q = q.filter(PreviousPaper.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, PreviousPaper.id.desc())

@router.post("/previous-papers", response_model=PreviousPaperOut, status_code=201)
def create_previouspaper(payload: PreviousPaperCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = PreviousPaper(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/previous-papers/{oid}", response_model=PreviousPaperOut)
def get_previouspaper(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, PreviousPaper, user.tenant_id, oid, "PreviousPaper")

@router.put("/previous-papers/{oid}", response_model=PreviousPaperOut)
def update_previouspaper(oid: int, payload: PreviousPaperUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, PreviousPaper, user.tenant_id, oid, "PreviousPaper")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/previous-papers/{oid}", status_code=204)
def delete_previouspaper(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, PreviousPaper, user.tenant_id, oid, "PreviousPaper")
    db.delete(obj); db.commit()
    return None

# ---------- EbookType ----------
@router.get("/ebook-types", response_model=PaginatedEbookTypes)
def list_ebooktypes(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(EbookType).filter(EbookType.tenant_id == user.tenant_id)
    if search:
        q = q.filter(EbookType.name.ilike(f"%{search}%"))
    return _list(q, page, per_page, EbookType.id.desc())

@router.post("/ebook-types", response_model=EbookTypeOut, status_code=201)
def create_ebooktype(payload: EbookTypeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = EbookType(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/ebook-types/{oid}", response_model=EbookTypeOut)
def get_ebooktype(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, EbookType, user.tenant_id, oid, "EbookType")

@router.put("/ebook-types/{oid}", response_model=EbookTypeOut)
def update_ebooktype(oid: int, payload: EbookTypeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, EbookType, user.tenant_id, oid, "EbookType")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/ebook-types/{oid}", status_code=204)
def delete_ebooktype(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, EbookType, user.tenant_id, oid, "EbookType")
    db.delete(obj); db.commit()
    return None

# ---------- Author ----------
@router.get("/authors", response_model=PaginatedAuthors)
def list_authors(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Author).filter(Author.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Author.name.ilike(f"%{search}%"))
    return _list(q, page, per_page, Author.id.desc())

@router.post("/authors", response_model=AuthorOut, status_code=201)
def create_author(payload: AuthorCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Author(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/authors/{oid}", response_model=AuthorOut)
def get_author(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Author, user.tenant_id, oid, "Author")

@router.put("/authors/{oid}", response_model=AuthorOut)
def update_author(oid: int, payload: AuthorUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Author, user.tenant_id, oid, "Author")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/authors/{oid}", status_code=204)
def delete_author(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Author, user.tenant_id, oid, "Author")
    db.delete(obj); db.commit()
    return None

# ---------- Ebook ----------
@router.get("/ebooks", response_model=PaginatedEbooks)
def list_ebooks(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Ebook).filter(Ebook.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Ebook.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, Ebook.id.desc())

@router.post("/ebooks", response_model=EbookOut, status_code=201)
def create_ebook(payload: EbookCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Ebook(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/ebooks/{oid}", response_model=EbookOut)
def get_ebook(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Ebook, user.tenant_id, oid, "Ebook")

@router.put("/ebooks/{oid}", response_model=EbookOut)
def update_ebook(oid: int, payload: EbookUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Ebook, user.tenant_id, oid, "Ebook")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/ebooks/{oid}", status_code=204)
def delete_ebook(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Ebook, user.tenant_id, oid, "Ebook")
    db.delete(obj); db.commit()
    return None

# ---------- EbookBanner ----------
@router.get("/ebook-banners", response_model=PaginatedEbookBanners)
def list_ebookbanners(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(EbookBanner).filter(EbookBanner.tenant_id == user.tenant_id)
    if search:
        q = q.filter(EbookBanner.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, EbookBanner.id.desc())

@router.post("/ebook-banners", response_model=EbookBannerOut, status_code=201)
def create_ebookbanner(payload: EbookBannerCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = EbookBanner(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/ebook-banners/{oid}", response_model=EbookBannerOut)
def get_ebookbanner(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, EbookBanner, user.tenant_id, oid, "EbookBanner")

@router.put("/ebook-banners/{oid}", response_model=EbookBannerOut)
def update_ebookbanner(oid: int, payload: EbookBannerUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, EbookBanner, user.tenant_id, oid, "EbookBanner")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/ebook-banners/{oid}", status_code=204)
def delete_ebookbanner(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, EbookBanner, user.tenant_id, oid, "EbookBanner")
    db.delete(obj); db.commit()
    return None

# ---------- Seminar ----------
@router.get("/seminars", response_model=PaginatedSeminars)
def list_seminars(search: str | None = None, category: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Seminar).filter(Seminar.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Seminar.title.ilike(f"%{search}%"))
    if category:
        q = q.filter(Seminar.category == category)
    return _list(q, page, per_page, Seminar.id.desc())

@router.post("/seminars", response_model=SeminarOut, status_code=201)
def create_seminar(payload: SeminarCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Seminar(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/seminars/{oid}", response_model=SeminarOut)
def get_seminar(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Seminar, user.tenant_id, oid, "Seminar")

@router.put("/seminars/{oid}", response_model=SeminarOut)
def update_seminar(oid: int, payload: SeminarUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Seminar, user.tenant_id, oid, "Seminar")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/seminars/{oid}", status_code=204)
def delete_seminar(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Seminar, user.tenant_id, oid, "Seminar")
    db.delete(obj); db.commit()
    return None

# ---------- Bundle ----------
@router.get("/bundles", response_model=PaginatedBundles)
def list_bundles(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Bundle).filter(Bundle.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Bundle.name.ilike(f"%{search}%"))
    return _list(q, page, per_page, Bundle.id.desc())

@router.post("/bundles", response_model=BundleOut, status_code=201)
def create_bundle(payload: BundleCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Bundle(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/bundles/{oid}", response_model=BundleOut)
def get_bundle(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Bundle, user.tenant_id, oid, "Bundle")

@router.put("/bundles/{oid}", response_model=BundleOut)
def update_bundle(oid: int, payload: BundleUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Bundle, user.tenant_id, oid, "Bundle")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/bundles/{oid}", status_code=204)
def delete_bundle(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Bundle, user.tenant_id, oid, "Bundle")
    db.delete(obj); db.commit()
    return None

# ---------- YoutubeVideo ----------
@router.get("/youtube-playlists", response_model=PaginatedYoutubeVideos)
def list_youtubevideos(search: str | None = None, category: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(YoutubeVideo).filter(YoutubeVideo.tenant_id == user.tenant_id)
    if search:
        q = q.filter(YoutubeVideo.title.ilike(f"%{search}%"))
    if category:
        q = q.filter(YoutubeVideo.category == category)
    return _list(q, page, per_page, YoutubeVideo.id.desc())

@router.post("/youtube-playlists", response_model=YoutubeVideoOut, status_code=201)
def create_youtubevideo(payload: YoutubeVideoCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = YoutubeVideo(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/youtube-playlists/{oid}", response_model=YoutubeVideoOut)
def get_youtubevideo(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, YoutubeVideo, user.tenant_id, oid, "YoutubeVideo")

@router.delete("/youtube-playlists/{oid}", status_code=204)
def delete_youtubevideo(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, YoutubeVideo, user.tenant_id, oid, "YoutubeVideo")
    db.delete(obj); db.commit()
    return None

# ---------- CurrentAffair ----------
@router.get("/current-affairs", response_model=PaginatedCurrentAffairs)
def list_currentaffairs(search: str | None = None, language: str | None = None, from_: date | None = Query(None, alias='from'), to: date | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(CurrentAffair).filter(CurrentAffair.tenant_id == user.tenant_id)
    if search:
        q = q.filter(CurrentAffair.title.ilike(f"%{search}%"))
    if language:
        q = q.filter(CurrentAffair.language == language)
    if from_ is not None:
        q = q.filter(CurrentAffair.published_date >= from_)
    if to is not None:
        q = q.filter(CurrentAffair.published_date <= to)
    return _list(q, page, per_page, CurrentAffair.id.desc())

@router.post("/current-affairs", response_model=CurrentAffairOut, status_code=201)
def create_currentaffair(payload: CurrentAffairCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = CurrentAffair(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/current-affairs/{oid}", response_model=CurrentAffairOut)
def get_currentaffair(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, CurrentAffair, user.tenant_id, oid, "CurrentAffair")

@router.put("/current-affairs/{oid}", response_model=CurrentAffairOut)
def update_currentaffair(oid: int, payload: CurrentAffairUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, CurrentAffair, user.tenant_id, oid, "CurrentAffair")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/current-affairs/{oid}", status_code=204)
def delete_currentaffair(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, CurrentAffair, user.tenant_id, oid, "CurrentAffair")
    db.delete(obj); db.commit()
    return None

# ---------- Job ----------
@router.get("/jobs", response_model=PaginatedJobs)
def list_jobs(search: str | None = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Job).filter(Job.tenant_id == user.tenant_id)
    if search:
        q = q.filter(Job.title.ilike(f"%{search}%"))
    return _list(q, page, per_page, Job.id.desc())

@router.post("/jobs", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = Job(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/jobs/{oid}", response_model=JobOut)
def get_job(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _or_404(db, Job, user.tenant_id, oid, "Job")

@router.put("/jobs/{oid}", response_model=JobOut)
def update_job(oid: int, payload: JobUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Job, user.tenant_id, oid, "Job")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/jobs/{oid}", status_code=204)
def delete_job(oid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = _or_404(db, Job, user.tenant_id, oid, "Job")
    db.delete(obj); db.commit()
    return None
