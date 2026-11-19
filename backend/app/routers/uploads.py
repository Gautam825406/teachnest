"""Uploads (Phase 2 #1): multipart file upload, local-disk store.

Files are stored under <UPLOAD_DIR>/<tenant_id>/<uuid>.<ext> and served
by StaticFiles mounted at /uploads in main.py. Only images and PDFs,
max 10 MB. No S3/R2 wiring in this phase — see backend/README.md.
"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import UploadOut

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
}

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "") or (Path(__file__).resolve().parent.parent / "uploads"))
UPLOAD_BACKEND = os.environ.get("UPLOAD_BACKEND", "local")


def upload_dir_for(tenant_id: int) -> Path:
    d = UPLOAD_DIR / str(tenant_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("", response_model=UploadOut, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    kind: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = db, kind  # kind is accepted for future categorisation; not stored yet
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Only images and PDF files are allowed")
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only images and PDF files are allowed")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 10 MB limit")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = upload_dir_for(user.tenant_id) / filename
    dest.write_bytes(data)
    return UploadOut(
        url=f"/uploads/{user.tenant_id}/{filename}",
        filename=filename,
        size_bytes=len(data),
        content_type=file.content_type or "application/octet-stream",
    )
