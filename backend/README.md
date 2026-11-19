# TeachNest — Backend (Phase 1)

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

## Tests

```bash
pytest -v
```

Tests use a temporary SQLite database (see `tests/conftest.py`) and never
touch `app.db`.
