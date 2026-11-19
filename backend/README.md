# TeachNest — Backend (Phase 2)

FastAPI + SQLAlchemy + Pydantic v2. Multi-tenant SaaS backend built from the
functionality map in `~/workspace/your_files/classwalla-clone-functionality-map.md`
(spec in words only — no ClassWalla code, images or assets copied).
All API text is in English.

## Run

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Base URL: `http://localhost:8000`, all endpoints under `/api`.
CORS allows `http://localhost:3000` (the frontend).

## Database

Default: SQLite file `backend/app.db` (created automatically on startup).

Switch to PostgreSQL with the `DATABASE_URL` env var, e.g.:

```bash
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/teachnest uvicorn app.main:app --reload --port 8000
```

The code uses only Postgres-compatible SQLAlchemy (JSON columns, no
SQLite-only SQL), so the same code runs on both.

Other env vars:

| Var | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./app.db` | Database connection string |
| `SECRET_KEY` | dev default | JWT signing key — **change in production** |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `UPLOAD_DIR` | `backend/uploads/` | Local upload store (see below) |
| `UPLOAD_BACKEND` | `local` | `local` only for now; `s3`/`r2` is a future switch |

## Auth

- `POST /api/auth/signup` `{tenant_name, username, email, password}` — creates a
  tenant (8-char uppercase `org_code`, e.g. `DEMO0001` style) + Super Admin user.
- `POST /api/auth/login` `{username, password}` (JSON) — same response shape.
  Wrong credentials → `401`.
- `GET /api/auth/me` — Bearer token required.
- JWT carries `tenant_id`; every row is scoped to a tenant and every endpoint
  filters by the JWT user's tenant. Requesting another tenant's
  course/student/order id returns `404` (existence is not leaked).

## Demo seed data

On startup, if the database is empty, demo data is seeded automatically
(idempotent — safe to re-run). Also runnable manually:

```bash
python seed.py
# or
python -m app.seed
```

Demo credentials:

| Tenant | Org code | Username | Password |
| --- | --- | --- | --- |
| Demo Academy | `DEMO0001` | `admin` | `Admin@123` |
| Second Academy | `SECN0002` | `secondadmin` | `Second@123` |

Demo Academy seeds 5 courses (incl. "Hindi Class 12" and English courses),
2 course categories + subcategories, 1 teacher, 8 students and 5 orders
(mixed SUCCESS/PENDING).

**Second Academy exists ONLY for tenant-isolation verification** — it has
1 course and 1 student, and its admin must not be able to see any Demo
Academy data (verified by `tests/test_tenant_isolation.py`).

All seed data is clearly demo data (`.local` / `example.com` emails,
`TXNDEMO…` transaction ids).

## Endpoints (summary)

- `GET /api/health` → `{"status": "ok"}`
- `GET /api/dashboard/stats?start_date=&end_date=` — earnings/students/
  courses/teachers/orders computed from real DB rows; storage FREE 1 TB;
  payment gateway Razorpay LINKED `SQIP****`.
- Courses: `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/{id}`
  (`?search=&category_id=&page=&per_page=`, returns `{items, total}`)
- Categories: `GET/POST/PUT/DELETE /api/course-categories`,
  `GET/POST/PUT/DELETE /api/course-subcategories`
- Teachers: `GET/POST/PUT/DELETE /api/teachers` (phone = exactly 10 digits)
- Students: `GET /api/students?search=&phone=&email=&city=&state=&from=&to=`
  (list returns `masked_phone` like `+91 *****97980`; detail returns the full
  phone), `GET /api/students/{id}`
- Orders: `GET /api/orders?search=&status=`, `GET /api/orders/export` (CSV),
  `GET /api/orders/{id}`
- Roles: `GET/POST/PUT/DELETE /api/roles` — permissions validated against the
  exact permission list from the spec (37 strings as listed; the spec text
  says 36, the list itself wins); seeded roles Admin (system default, all 37) and
  Teacher (subset).
- Settings: `GET /api/settings`, `PUT /api/settings`

## Uploads (Phase 2)

- `POST /api/uploads` (multipart, field `file`, optional `kind`) — images
  and PDFs only, max 10 MB. Files are stored under
  `backend/uploads/<tenant_id>/<uuid>.<ext>` and served at
  `/uploads/<tenant_id>/<filename>` (StaticFiles, mounted in `main.py`).
  Response: `{url, filename, size_bytes, content_type}`.
- **CourseForm / Teacher photo wiring:** there is no separate upload field
  on the Course or Teacher schemas — the frontend uploads the file first via
  `POST /api/uploads`, then saves the returned `url` into the existing
  `thumbnail_url` / `syllabus_url` (Course) or `photo_url` (Teacher) fields.
  No schema change was needed.
- **S3/R2 switch (future):** set `UPLOAD_BACKEND=s3` (or `r2`) and point
  `UPLOAD_DIR` at the bucket prefix; the upload endpoint is the single place
  that writes files, so only `routers/uploads.py` (storage backend) and the
  StaticFiles mount in `main.py` (signed-URL / CDN serving) need to change.
  No keys are stored in the repo — use env vars via the host (Render/Vercel)
  when that switch is made.

## Phase 2 endpoints (all JWT-protected, tenant-scoped, 404 cross-tenant)

Lists return `{items, total}` and accept `?search=&page=&per_page=` unless noted.

- Uploads: `POST /api/uploads` (see above); files served at `/uploads/...`
- Test Series: `GET/POST /api/test-series`, `GET/PUT/DELETE /api/test-series/{id}`,
  `GET/POST /api/test-series/{id}/questions`, `DELETE /api/test-series/{id}/questions/{qid}`
- Video Assignments: `GET/POST/PUT/DELETE /api/video-assignments`,
  `GET /api/video-assignments/submissions?assignment_id=&student_id=`,
  `POST /api/video-assignments/submissions`, `PUT /api/video-assignments/submissions/{id}`
  (`{marks, feedback, status}`)
- Test Assignments: `GET/POST/PUT/DELETE /api/test-assignments`,
  `GET/POST/PUT /api/test-assignments/student-assignments`
- Scores: `GET /api/scores?test_series_id=&chapter_test=`, `POST /api/scores`;
  `GET /api/score-sheet?test_series_id=&chapter_test=` → `{students: [{student_id, student_name, score, total_marks}]}`
- Notes & Docs: `GET/POST/PUT/DELETE /api/notes?kind=&folder=&search=`
  (kind = `note|folder|syllabus|uploaded`)
- Previous Papers: `GET/POST/PUT/DELETE /api/previous-papers`, `GET/POST/PUT/DELETE /api/exam-types`
- E-Books: `GET/POST/PUT/DELETE /api/ebooks`, `/api/ebook-types`, `/api/authors`, `/api/ebook-banners`
- Seminars: `GET/POST/PUT/DELETE /api/seminars`
- Item Bundles: `GET/POST/PUT/DELETE /api/bundles` (`course_ids`, `test_series_ids`, `ebook_ids` JSON lists)
- YouTube Playlist: `GET/POST/DELETE /api/youtube-playlists`
- Leads: `GET/POST/PUT/DELETE /api/leads?type=&search=` (type = `custom|signup|expired`)
- Toppers & Reviews: `GET/POST/PUT/DELETE /api/testimonials`, `/api/toppers`;
  `GET /api/toppers/call-list` (toppers with the student's phone)
- App Banners: `GET/POST/PUT/DELETE /api/banners`
- Push Notifications: `GET/POST /api/notifications` (POST sends immediately, `status: SENT`)
- Current Affairs: `GET/POST/DELETE /api/current-affairs?search=&language=&from=&to=`;
  Jobs: `GET/POST/PUT/DELETE /api/jobs`
- Coupons: `GET/POST/PUT/DELETE /api/coupons`, `GET /api/coupons/applied`
- OTP Usage: `GET /api/otp-usage?mobile=&search=` (read-only; 3 rows seeded)
- Orders extensions: `POST /api/orders/{id}/transfer {to_student_id}`,
  `POST /api/orders/{id}/refund {reason}` (→ `REFUNDED`),
  `POST /api/orders/{id}/deactivate` (→ `DEACTIVATED`),
  `GET /api/orders/deactivated`, `GET /api/orders/company` (all orders)
- Help & Support: `GET/POST/PUT/DELETE /api/enquiries`, `/api/enquiry-types`
- Integrations: `GET /api/integrations` (static WhatsApp API + TeachNest AI cards,
  both `INACTIVE`/`BETA` — no real keys, no wiring),
  `POST /api/integrations/{provider}/setup` → `{"status": "INACTIVE", "message": "Setup is not available in this demo — no real keys are stored."}`
- Users: `GET /api/users`, `POST /api/users` (`{username, email, password, role}`, bcrypt hash, tenant-scoped uniqueness)
- System Logs: `GET /api/course-logs` (auto-logged on course create/update/delete and test-series create)

Demo seed (Phase 2, Demo Academy only): 2 test series × 3 questions,
1 video assignment + 2 submissions, 1 test assignment + 2 student assignments,
3 scores, 3 notes, 2 previous papers + 2 exam types, 2 e-books + 2 types +
2 authors + 1 banner, 1 seminar, 1 bundle, 2 YouTube videos, 3 leads,
2 testimonials, 2 toppers, 3 banners, 2 notifications, 3 current affairs,
2 jobs, 2 coupons + 1 applied, 3 OTP rows, 2 enquiries + 2 types,
a second user (`teacher1`), 3 course logs. Second Academy gets nothing new.

## Tests

```bash
pytest -v
```

Tests use a temporary SQLite database (see `tests/conftest.py`) and never
touch `app.db`.
