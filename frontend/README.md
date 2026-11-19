# TeachNest — Frontend (Phase 1)

Next.js 14 (App Router, React + TypeScript) + Tailwind CSS. Hand-rolled
shadcn/ui-style components (no shadcn CLI dependency). All UI text is in
English. No mock data: every page fetches real data from the backend API.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Configuration

Set the backend API base URL (defaults to `http://localhost:8000/api`):

```bash
cp .env.example .env.local
# edit NEXT_PUBLIC_API_URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

The backend is expected at that URL; the frontend does not start one.

## Auth

- `/login` — username + password, "Let's Go" button. On success the JWT
  (`access_token`) and user object are stored in `localStorage`
  (`cw_token` / `cw_user`).
- `/signup` — tenant name, username, email, password; creates the tenant
  and its Super Admin, then redirects to `/dashboard`.
- All `/dashboard/*` pages are auth-guarded: without a token they redirect
  to `/login`. Logout clears the token. A 401 from the API also clears the
  token and redirects to `/login` ("Session has expired").

## Pages

| Route | What it does |
| --- | --- |
| `/dashboard` | Stats from `GET /api/dashboard/stats?start_date&end_date`, wallet, storage, Razorpay gateway card, Updates & News carousel, FILTER ANALYTICS (date range + Apply Filter re-fetches stats) |
| `/dashboard/courses` | Course list (search, per-page, pagination, Edit/Delete) |
| `/dashboard/courses/new`, `/dashboard/courses/[id]/edit` | "Manage Course" — 5 sections (Basic, Meta, Social, Advance, Teachers) with live preview card |
| `/dashboard/courses/categories` | Course Category + Course Sub Category CRUD |
| `/dashboard/students`, `/dashboard/students/[id]` | Student Directory (search by name/phone/email/date/city/state) + detail view |
| `/dashboard/orders` | All Orders table + CSV export via `GET /api/orders/export` |
| `/dashboard/teachers` | Teacher list + Create/Edit modal with all spec fields |
| `/dashboard/roles` | Roles + Create/Edit modal with the exact 36 permissions |
| `/dashboard/settings` | Company Settings tabs (Company Info, About Us, Privacy Policy, Refund Policy, Terms & Conditions) |
| `/dashboard/coming-soon?feature=X` | Shared "Coming soon in Phase 2" empty state for every non-Phase-1 sidebar item |

## Notes / contract assumptions

- List endpoints are read as `{items, total}` (a bare array is also accepted).
- `GET /api/teachers` is read the same way (`{items, total}` or array).
- `GET /api/course-categories` and `/api/course-subcategories` are read as
  arrays (the contract lists them without a wrapper).
- `GET /api/roles` is read as an array or `{items}`.
- Thumbnail / syllabus / profile-photo uploads have no upload endpoint in
  the Phase 1 contract, so the file input stores the selected file's name
  as the `thumbnail_url` / `syllabus_url` / `photo_url` string. A real file
  upload endpoint would replace this.
- The dashboard "All courses" filter combobox has only the "All courses"
  option until a course-filter parameter exists in the stats contract; the
  date filter is the one that re-fetches stats.
- Theme (dark/light) is persisted in `localStorage` (`cw_theme`).
- Command palette: Ctrl/Cmd+K (or the "Quick find..." box) jumps to pages.
