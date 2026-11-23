# TeachNest — Phase 2

A multi-tenant coaching-institute SaaS admin panel, built from the functionality
map in `~/workspace/your_files/classwalla-clone-functionality-map.md`
(explored live from adminpanel.classwalla.com on 20 Nov 2026).
Built from the spec in words only — no ClassWalla code, images or assets were
copied. All UI text is in English.

## Phase 2 — what was added (20 Nov 2026, local only — not deployed/pushed)

All Phase 1 features still work (verified: backend pytest 29 passed — 15 Phase 1
+ 14 new Phase 2 tests; frontend `npm run build` passes, 40 routes; live local
spot-check of all 33 new endpoint groups returned 200 with seeded totals).

- **Test Series** — list/create/edit + detail with MCQ questions (4 options,
  correct answer, marks, negative marks).
- **Video Assignments** — assignments + student submissions with grading
  (marks/feedback/status). **Test Assignments** — assignments + student
  assignments with scores. **Score Sheet** — chapter-wise test + test series
  selectors, per-student scores table.
- **Notes & Docs** — Add Notes, Folder Notes (Beta), Syllabus, Uploaded Notes
  (real PDF upload). **Previous Papers** — Add Papers + Exam Types CRUD.
- **E-Books** — list/create (author, type, price, file upload), E-Book Types,
  Authors, E-Book Banners.
- **Seminars, Item Bundles** (courses + test series + e-books combo pricing),
  **YouTube Playlist** (video ID, title, category).
- **Students & Marketing** — Leads (Custom/Signup/Expired), Toppers & Reviews
  (Testimonials, Toppers, Toppers Call List), App Banners, Push Notifications
  (list + Send form), Current Affairs, Latest Jobs.
- **Sales & Billing** — Discounts & Coupons (All + Applied), OTP Usage,
  Orders: Transfer/Refund/Deactivate actions + Deactivated Courses view.
- **System & Config** — Help & Support (Enquiries + Enquiry Types),
  Integrations (WhatsApp API BETA INACTIVE, TeachNest AI BETA INACTIVE —
  setup/status only, no real keys), User Management — Users list, System Logs
  — Course Logs (auto-logged on course/test-series create/update/delete).
- **Real file uploads** — `POST /api/uploads` (images/PDF, max 10 MB, stored
  under `backend/uploads/<tenant_id>/`, served at `/uploads/...`). Local-disk
  store for now; switch to S3/R2 via `UPLOAD_DIR` / `UPLOAD_BACKEND` — see
  `backend/README.md`. Course thumbnails/syllabus and teacher photos now
  upload through it instead of storing just a filename.
- **Sidebar** — every Phase 1 "Coming soon in Phase 2" entry is now a real
  page; no dead menu items remain in Phase 2 scope.
- **Demo seed (Demo Academy only)** — 2 test series × 3 questions, 1 video
  assignment + 2 submissions, 1 test assignment + 2 student assignments,
  3 scores, 3 notes, 2 previous papers + 2 exam types, 2 e-books + 2 types +
  2 authors + 1 e-book banner, 1 seminar, 1 bundle, 2 YouTube videos,
  3 leads (one per type), 2 testimonials, 2 toppers, 3 banners,
  2 notifications, 3 current affairs, 2 jobs, 2 coupons + 1 applied,
  3 OTP rows, 2 enquiries + 2 enquiry types, second user `teacher1`
  (Teacher role), 3 course logs.

## Phase 1 (original)

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
| Payments | Cashfree PG (Phase 4, real) — orders, webhook, server-side verify; shows "not configured" until keys are set |

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

On the login page, use **Try demo as Super Admin** or **Try demo as Teacher**
for one-click demo login — no signup needed. Or log in manually with:

| Tenant | Org code | Username | Password | Role |
|---|---|---|---|---|
| Demo Academy | DEMO0001 | `admin` | `Admin@123` | Super Admin |
| Demo Academy | DEMO0001 | `teacher1` | `Teacher@123` | Teacher |
| Second Academy (tenant-isolation check only) | SECN0002 | `secondadmin` | `Second@123` | Super Admin |

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
   Payment Gateway card: Cashfree, with live configured/not-configured status (Phase 4).
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
- **Cashfree:** real PG integration in Phase 4 (see below). Until `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` are set, payments honestly report "Cashfree not configured".
- **Dashboard "All courses" filter:** only the "All courses" option exists;
  the date filter is the one that re-fetches stats (no per-course stats
  parameter in the Phase 1 contract).

## What is still missing (Phase 3 / Phase 4)

- Video storage/streaming (uploads are local disk in Phase 2)
- AI question-paper generator (upload PDF/TXT/XLSX/CSV/image/DOCX) —
  TeachNest AI is a status-only card in Phase 2
- Real WhatsApp integration (status-only card in Phase 2)

## Phase 3 — Student mobile app (built 20 Nov 2026, local only — NOT pushed to GitHub, NOT deployed live)

White-label student app in `mobile/` (React Native + Expo SDK 54, TypeScript,
Expo Router). One codebase, rebranded per institute from the single config
`mobile/config/brand.ts` (appName, instituteName, orgCode, tagline, colours)
+ `mobile/app.json` name/slug — demo config is Demo Academy, orgCode
`DEMO0001`, deep indigo theme. See `mobile/README.md` for the full rebrand
steps and how to run (Expo Go / emulator).

- **Student auth** — phone + OTP, demo OTP **`123456`** (no real SMS; the
  OTP screen says so). New endpoints under `/api/student/*` (see
  `backend/app/routers/student.py`): request-otp, verify (creates the
  student in the tenant on first registration; the student then appears in
  the admin panel's Student Directory), student JWT (`sub: "student:<id>"`,
  separate from admin tokens — admin tokens are rejected on student routes).
- **Screens (all English, no mock data)** — Home (banners, featured courses,
  test series, current affairs, jobs, toppers, testimonials), Courses
  (browse/search/detail + demo purchase), Learn (recorded YouTube videos,
  notes, syllabus, previous papers, e-books), Tests (one question at a
  time, timer, submit, result + Score Sheet), Live (seminars + Join Live
  Class — clearly labelled DEMO, no real video yet), Assignments (video
  text submit + test submit, submissions/scores), Profile (My Courses,
  My Orders, Notifications, Help & Support enquiry, Settings, Logout).
- **Demo purchase only** — Buy Now creates a SUCCESS order with a
  `DEMO-<id>` transaction id and grants access; labelled "Demo purchase —
  no real payment" in the app. No real Cashfree payment, no real OTP SMS, no real
  live-class video, no real push (notifications list in-app only).
- **Demo student login** — org code `DEMO0001`, any 10-digit mobile
  (e.g. `9876500001` = seeded student Aarav Sharma), OTP `123456`, name
  on first registration.
- **Verification (20 Nov 2026, local)** — backend pytest **38 passed,
  0 failed** (29 Phases 1–2 + 9 new Phase 3); `npx tsc --noEmit` exit 0;
  `npx expo-doctor` 18/18; `npx expo export --platform android
  --no-bytecode` exit 0. Local API flows verified end-to-end against a
  fresh seeded backend: request-otp 200, verify 200 (token 203 chars),
  courses 200 (total 5), notes 200 (total 3), test-series detail 200
  (3 questions, no correct answers leaked), attempt 200 (3.0/3.0),
  scores 200, demo purchase 200 (SUCCESS, `DEMO-F41EF8D9`), my-courses
  200, home 200, bad token 401.
- **Not live yet** — the Phase 3 student API is NOT on the live backend:
  `GET https://teachnest-api.onrender.com/api/student/home` returns 404
  until the Phase 3 code is pushed and Render redeploys. The app defaults
  to the live URL, so use `EXPO_PUBLIC_API_URL=http://localhost:8000/api`
  (or `http://10.0.2.2:8000/api` on an Android emulator) to test locally.
  Plain `npx expo export` (all platforms incl. web) fails — `react-native-web`
  is not installed; Hermes bytecode export fails in this VM's hermesc on
  React Native's own files (toolchain issue, not app code).

## Phase 4 — Integrations & AI (built 20 Nov 2026, local only — NOT pushed to GitHub, NOT deployed live)

Cashfree replaces Razorpay everywhere (no Razorpay code remains in the app).
- **Cashfree payments** — `POST /api/payments/create-order` (Cashfree PG API 2023-08-01, `payment_session_id` + payment link), `POST /api/payments/cashfree/webhook` (HMAC-SHA256 signature verification; verified success marks PAID and grants enrolment), `GET /api/payments/cashfree/return` (server-side verify). Student flow: `POST /api/student/payments/create-order` → payment link in-app → `POST /api/student/payments/verify`. Wallet top-up and storage purchase use the same flow. Without `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` every payment call returns 503 "Cashfree not configured" — never a fake success. Webhook URL to register in the Cashfree dashboard: `https://teachnest-api.onrender.com/api/payments/cashfree/webhook`.
- **AI question-paper generator** — admin page `/dashboard/ai-generator`: upload PDF/TXT/XLSX/CSV/DOCX (images need pytesseract, not installed — clear error otherwise) or paste text; Groq (`llama-3.3-70b-versatile`) generates MCQ/short questions; teacher reviews/edits, saves into a test series. Without `GROQ_API_KEY` → "AI not configured".
- **WhatsApp** — Meta WhatsApp Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`); templates `teachnest_enrolment`, `teachnest_payment_receipt`, `teachnest_test_reminder`; every attempt logged. **FCM push** — `FIREBASE_SERVICE_ACCOUNT_JSON`; topic-based sends. **Live classes** — 100ms (`HMS_*`) or Agora (`AGORA_*`); unconfigured keeps the DEMO label; student live config at `GET /api/student/live/config`. **OTP SMS** — MSG91 (`MSG91_API_KEY`) with Exotel fallback; unconfigured keeps demo OTP `123456` labelled DEMO.
- **Verification (20 Nov 2026, local)** — backend pytest **53 passed** (38 pre-existing + 15 Phase 4); frontend `npm run build` passes (41 routes incl. `/dashboard/ai-generator`); mobile `npx tsc --noEmit` passes. Live smoke test: integrations status shows all providers unconfigured with no secrets leaked; create-order → 503; AI generate → 503; student live config → 200 with a student token.
- **Env vars to set (Render dashboard → Environment; Vercel needs none new)** — `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` (SANDBOX default), `GROQ_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `HMS_API_KEY`/`HMS_API_SECRET` or `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `MSG91_API_KEY`, `EXOTEL_SID`/`EXOTEL_API_KEY`/`EXOTEL_TOKEN`. Full details in `backend/README.md`. No real provider has been tested end-to-end yet — a real Cashfree (sandbox) payment test is still needed after keys are set.

## Phase 5 — Missing Courses features (built 20 Nov 2026, local only — NOT pushed to GitHub, NOT deployed live)

The ClassWalla screenshot's Courses submenu items that were missing:
- **Add Subject** — subjects per course (`/api/courses/{id}/subjects`, admin page `/dashboard/courses/subjects`).
- **Add Topic** — topics per subject (`/api/subjects/{id}/topics`, page `/dashboard/courses/topics`).
- **Add Videos** — course lecture videos per course → subject → topic (`/api/courses/{id}/videos`, page `/dashboard/courses/videos`; YouTube link or uploaded file URL, free-preview flag). Not Video Assignments or YouTube Playlist.
- **Packages** — multi-course packages with own price (`/api/course-packages`, page `/dashboard/courses/packages`; Item Bundles left alone).
- **Copy Course** — `POST /api/courses/{id}/copy` deep-copies a course with its subjects, topics and videos (page `/dashboard/courses/copy`).
- **Sub Category fix** — sidebar now opens `/dashboard/courses/categories?tab=subcategory` and the categories page honours `?tab=`.
- **Mobile** — course detail shows a read-only Course Content section (subjects → topics → videos) via `GET /api/student/courses/{id}/content`; videos open via the existing in-app browser link.
- **Verification (local)** — backend pytest **60 passed** (53 pre-existing + 7 new incl. cascade-delete test); frontend `npm run build` passes (46 routes); mobile `npx tsc --noEmit` passes.
