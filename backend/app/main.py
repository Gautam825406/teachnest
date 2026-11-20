from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_ORIGIN
from .database import Base, engine
from .routers import (
    assignments,
    auth,
    categories,
    content,
    courses,
    dashboard,
    engagement,
    integrations,
    orders,
    roles,
    settings,
    student,
    students,
    teachers,
    test_series,
    uploads,
)
from .routers.uploads import UPLOAD_DIR
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed()
    yield


app = FastAPI(title="TeachNest API (Phase 4)", version="4.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:3000",
        "https://teachnest.vercel.app",
        "https://teachnest-eight.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded files (Phase 2 #1): local-disk store, served at /uploads/<tenant_id>/<file>.
# See backend/README.md for the S3/R2 switch.
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(teachers.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
# Phase 2
app.include_router(uploads.router, prefix="/api")
app.include_router(test_series.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(engagement.router, prefix="/api")
# Phase 3 (student mobile API)
app.include_router(student.router, prefix="/api")
# Phase 4 (Cashfree payments, AI, WhatsApp, push, live)
app.include_router(integrations.router, prefix="/api")
