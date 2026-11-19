# TeachNest — Phase 1

A multi-tenant coaching-institute SaaS admin panel, built from the functionality
map in `~/workspace/your_files/classwalla-clone-functionality-map.md`
(explored live from adminpanel.classwalla.com on 20 Nov 2026).
Built from the spec in words only — no ClassWalla code, images or assets were
copied. All UI text is in English.

## Tech stack

| Layer | Technology |
|---|---|
| Admin frontend | Next.js 14 (App Router, React + TypeScript) + Tailwind CSS + shadcn-style components |
| Backend API | FastAPI (Python 3.12) + SQLAlchemy + Pydantic v2 |
| Database | SQLite by default for local dev; PostgreSQL via `DATABASE_URL` (see below) |
| Auth | JWT (carries `tenant_id`), bcrypt password hashing |
| Payments | Razorpay — **Phase 1 stub only**: the dashboard shows LINKED status, no real payments are wired |

## Repo structure

```
teachnest/
├── README.md                  # this file
├── backend/
│   ├── README.md              # backend run instructions, endpoints, Postgres switch
│   ├── requirements.txt
│   ├── seed.py                # manual re-seed entry point
│   ├── app/
│   │   ├── main.py            # app, CORS, lifespan (create tables + seed)
│   │   ├── config.py          # settings / DATABASE_URL / JWT secret
│   │   ├── database.py        # engine + session (SQLite default)
│   │   ├── models.py          # Tenant, User, Role, Course, Category, Teacher, Student, Order, Settings
│   │   ├── schemas.py         # Pydantic v2 schemas
│   │   ├── security.py        # bcrypt + JWT
│   │   ├── deps.py            # current-user / current-tenant dependencies
│   │   ├── permissions.py     # permission list (see note below)
│   │   ├── seed.py            # demo seed data (idempotent)
│   │   └── routers/           # auth, dashboard, courses, categories, teachers,
│   │                          # students, orders (+ CSV export), roles, settings
│   └── tests/                 # pytest: API + tenant isolation
└── frontend/
    ├── README.md              # frontend run instructions, page map
    ├── package.json
    ├── app/                   # login, signup, dashboard layout + pages
    │   ├── login/  signup/
    │   └── dashboard/         # dashboard, courses (+ new/[id]/edit, categories),
    │                          # students (+ [id]), orders, teachers, roles,
    │                          # settings, coming-soon
    ├── components/            # AppShell (top bar + sidebar + theme), ui, CourseForm
    └── lib/                   # api.ts (typed client), nav.ts (sidebar), permissions.ts
```

## How to run locally

### 1. Backend (port 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/api/health` → `{"status":"ok"}`

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — you will be redirected to `/login`.
Set `NEXT_PUBLIC_API_URL` (see `frontend/.env.example`) if the backend is not
on `http://localhost:8000/api`.

## Demo login credentials (seeded demo data — clearly labelled demo)

| Tenant | Org code | Username | Password |
|---|---|---|---|
| Demo Academy | DEMO0001 | `admin` | `Admin@123` |
| Second Academy (tenant-isolation check only) | SECN0002 | `secondadmin` | `Second@123` |

Demo Academy seed: 5 courses (incl. "Hindi Class 12"), 2 course categories +
3 subcategories, 1 teacher, 8 students, 5 orders (4 SUCCESS totalling ₹6,996
+ 1 PENDING ₹1,499). Second Academy: 1 course + 1 student only.
The database is re-seeded automatically on backend startup if empty
(`backend/app.db` for SQLite). Re-seed manually with `python seed.py`.

Signup also works end-to-end: it creates a new tenant + ORG code + Super Admin.

## What Phase 1 includes

1. **Multi-tenant auth** — signup creates tenant + ORG code + Super Admin;
   login (username/password, "Let's Go"); logout; session persists via JWT.
2. **Dashboard** — top bar (logo, dark/light Toggle Theme, tenant name + role
   badge + Active status, logout, Quick find with Cmd/Ctrl+K palette, sidebar
   drawer); Welcome back message; Wallet Balance card; Updates & News carousel
   (AI question-paper item + storage billing item); Filter Analytics with
   date-range picker; stat cards (Today's Earnings, Recently Joined, Total
   Earnings, Total Classes Taken, Video Storage with Storage Plan / Buy Storage,
   Payment Gateway card: Razorpay LINKED).
3. **Sidebar in the exact spec order/groups** — Dashboard; Academics &
   Content; Testing & Resources; Students & Marketing; Sales & Billing;
   System & Config. Items beyond Phase 1 show a clean "Coming soon in
   Phase 2" empty state — no fake data.
4. **Courses** — list (cards, TOTAL count, Refresh, per-page, filters),
   Add/Edit Course with the 5 spec sections (Basic Info, Meta Details,
   Social Details, Advance Details, Teachers) + live preview card,
   Course Category / Sub Category CRUD.
5. **Students** — Student Directory (search by Name/Phone/Email/date/City/
   State, initial-avatar cards, masked phone, signup date, View link) +
   student detail view.
6. **Purchases & Orders** — All Orders table (STUDENT, CONTACT, STATUS,
   TRANSACTION ID, DATE & AMOUNT, ITEMS, ACTIONS), Filters + Export (CSV).
7. **Teachers** — list + Create/Edit modal with all spec fields.
8. **Roles** — list + Create Role modal with the permission list (see note).
9. **Account Settings** — Company Settings with Company Info / About Us /
   Privacy Policy / Refund Policy / Terms tabs, Edit Details.

## Verification (20 Nov 2026, local only — nothing deployed)

- Backend pytest: **15 passed, 0 failed** (`cd backend && .venv/bin/python -m pytest tests/ -q`)
- Backend live (uvicorn :8000): health OK; login `admin/Admin@123` → 200;
  wrong password → 401; dashboard stats computed from real DB rows
  (today's ₹2,998, total ₹6,996, 5 courses, 8 students, 1 teacher, 5 orders);
  courses list total 5, first "Hindi Class 12"; students search works;
  orders CSV export works.
- Course create → edit → delete verified live via curl (created id 7,
  edited price 499 → 449, deleted, total back to 5).
- Tenant isolation verified live: `secondadmin` sees only its own 1 course;
  `GET /api/courses/1` and `GET /api/students/1` as second tenant → **404**.
  Also covered in pytest.
- Frontend `npm run build`: **PASS** (Next.js 14.2.18, 16 routes, no type errors).
- Frontend dev server: `/login` → HTTP 200, contains "Enter your username"
  and "Let's Go"; `/` and `/dashboard` serve 200 (auth guard is client-side).
- **Not verified in a real browser** (no live-browser session in this task):
  the full click-through (login → dashboard render → form submit in the UI)
  has not been exercised end-to-end in a browser. API-level verification
  above covers the same flows.

## Postgres switch

Set `DATABASE_URL` before starting the backend, e.g.:

```bash
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/teachnest \
  .venv/bin/uvicorn app.main:app --port 8000
```

The code uses only Postgres-compatible SQL (JSON columns, no SQLite-only
features). `psycopg2-binary` is already in `requirements.txt`. For production
also set `SECRET_KEY` (JWT signing key) via env — see `backend/app/config.py`
and `backend/README.md`.

## Known notes / limitations

- **Permissions count:** the spec says "36 permissions" but the list it gives
  contains **37 strings**. The list itself is authoritative — both backend
  and frontend implement and validate all 37; the seeded Admin role has all 37.
- **File uploads:** there is no upload endpoint in the Phase 1 contract, so
  thumbnail / syllabus PDF / teacher photo inputs store the selected file's
  **name** as the URL string. A real upload endpoint (Phase 2) replaces this.
- **Video storage:** dashboard card only in Phase 1 (0.0 MB used / 1.00 TB,
  FREE plan). No videos exist yet, so nothing is invented.
- **Razorpay:** status display only; no payment wiring, no keys.
- **Dashboard "All courses" filter:** only the "All courses" option exists;
  the date filter is the one that re-fetches stats (no per-course stats
  parameter in the Phase 1 contract).

## What is still missing (Phase 2)

- Test Series, Video/Test Assignments + submissions, Score Sheet
- Notes & Docs, Previous Papers, E-Books, Seminars, Item Bundles, YouTube Playlist
- Leads, Toppers & Reviews, App Banners, Push Notifications, Current Affairs, Latest Jobs
- Discounts & Coupons, OTP Usage, Help & Support, Integrations (WhatsApp API,
  TeachNest AI), Users list, System Logs
- Real file uploads (thumbnails, syllabus PDFs, teacher photos) + video
  storage/streaming, real Razorpay checkout, wallet top-up / storage purchase
- AI question-paper generator (upload PDF/TXT/XLSX/CSV/image/DOCX)

## Phase 3 (not started)

White-label student mobile app (React Native + Expo, one codebase rebranded
per institute): mobile OTP login/register, course browsing + purchase,
recorded + live classes, tests, notes/e-books, push notifications.
