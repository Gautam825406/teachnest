# TeachNest — Frontend (Phase 1–4)

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

No secrets live in the frontend. All credentials are backend-only Render
environment variables, surfaced in the UI only as configured/not-configured
status:

- `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` (PROD or SANDBOX) — payments
- `GROQ_API_KEY` — TeachNest AI / AI Question Paper Generator
- WhatsApp provider credentials — WhatsApp test messages
- Live provider credentials (100ms or Agora) — live classes
- FCM credentials — push notifications
- SMS provider credentials — SMS OTP

## Phase 4 endpoints used

- `GET /api/integrations/status` — live status for Cashfree, Groq, WhatsApp, live, FCM, SMS
- `POST /api/payments/create-order` `{item_type, item_id, amount}` → payment link; `GET /api/payments/{order_id}`; `GET /api/payments/cashfree/return?order_id=`
- `POST /api/ai/generate-questions` (multipart file or text + topic, class_name, difficulty, count, question_type); `POST /api/ai/questions/save`; `GET /api/ai/generations`
- `POST /api/integrations/whatsapp/send`; `POST /api/integrations/push/send`
- `GET /api/live/config`

If a Phase 4 endpoint is not deployed yet (404), the page shows an honest
"unavailable / not configured" state instead of fake data.

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
| `/dashboard` | Stats from `GET /api/dashboard/stats?start_date&end_date`, wallet, storage, Cashfree gateway card (live status from `GET /api/integrations/status`), Updates & News carousel, FILTER ANALYTICS (date range + Apply Filter re-fetches stats). Wallet top-up and Buy Storage open a Cashfree payment order (`POST /api/payments/create-order`) with a payment link and a Verify payment button (`GET /api/payments/cashfree/return?order_id=`) |
| `/dashboard/integrations` | Live integration status from `GET /api/integrations/status` — Cashfree (PROD/SANDBOX or not configured), TeachNest AI (Groq), WhatsApp, Live classes, Push (FCM), SMS OTP — each with the env vars it needs. WhatsApp test-send form (`POST /api/integrations/whatsapp/send`) and Push send form (`POST /api/integrations/push/send`), both showing the backend's honest "not configured" error when the service is not set up |
| `/dashboard/ai-generator` | AI Question Paper Generator — upload PDF/TXT/XLSX/CSV/DOCX/image or paste text, set topic/class/difficulty/count/question type, `POST /api/ai/generate-questions` (multipart), edit draft questions, then save to an existing test series via `POST /api/ai/questions/save`; past generations from `GET /api/ai/generations`. If Groq is not configured it shows "AI not configured — set GROQ_API_KEY" and never fakes questions |
| `/dashboard/courses` | Course list (search, per-page, pagination, Edit/Delete) |
| `/dashboard/courses/new`, `/dashboard/courses/[id]/edit` | "Manage Course" — 5 sections (Basic, Meta, Social, Advance, Teachers) with live preview card |
| `/dashboard/courses/categories` | Course Category + Course Sub Category CRUD |
| `/dashboard/students`, `/dashboard/students/[id]` | Student Directory (search by name/phone/email/date/city/state) + detail view |
| `/dashboard/orders` | All Orders table + CSV export via `GET /api/orders/export`; Cashfree order id + payment status column, with a per-order "Check payment" lookup via `GET /api/payments/{order_id}` |
| `/dashboard/teachers` | Teacher list + Create/Edit modal with all spec fields |
| `/dashboard/seminars` | Seminar list + Create/Edit, with a live-class provider/config banner from `GET /api/live/config` (DEMO label while unconfigured — never claims a real class is live) |
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

## Design system

The admin panel is styled to look like a polished product built by an
experienced team — restrained, dense, and consistent. Follow these rules
for every new page or component; do not reintroduce the old flat
slate/indigo look.

- **Typography:** Inter (loaded in `app/layout.tsx` via `next/font/google`,
  variable `--font-inter`, weights 400/500/600/700). Body 14px / 1.5.
  Page titles `text-xl font-semibold tracking-tight`; section labels
  11px uppercase `tracking-wider`. Money and counts use `tabular-nums`
  (see the `.tnum` helper in `app/globals.css`); ₹ uses Indian grouping
  via `formatINR` in `lib/api.ts`.
- **Palette:** one primary — deep desaturated navy `brand`
  (`tailwind.config.ts`): 50 `#eef1f8`, 100 `#dfe4f0`, 200 `#c3cbe0`,
  300 `#9aa8c6`, 400 `#6f80a8`, 500 `#4c5e8a`, 600 `#2f3f6e`,
  700 `#263258` (primary actions, hover `brand-800`), 800 `#1e2a4a`,
  900 `#17213c`, 950 `#0f172e`. Neutrals are warm stone, not cold
  blue-grey: light page `stone-50`, card white, border `stone-200`,
  secondary text `stone-500`; dark page `stone-950`, card `stone-900`,
  border `stone-800`. Status colours are muted and sparse:
  success `emerald-700` on `emerald-50`, warning `amber-700` on
  `amber-50`, danger `red-700` on `red-50` (dark: `*-300` on `*-950`).
- **Forbidden:** gradients (including gradient text), rainbow icon
  colours, glassmorphism, `rounded-3xl`, oversized hero-style headings
  inside the tool. Icons are Lucide, one muted tone (`stone-500`,
  active `brand-700`) — never coloured icon blobs.
- **Spacing / radius:** 4/8px scale, 24px content gutters,
  `max-w-[1200px]` content container. Cards `rounded-[10px]`, 1px border,
  `shadow-sm` only (modals `shadow-lg`). Buttons/inputs `h-9`/`h-10`,
  `rounded-lg`, focus ring `brand-600`.
- **Components (`components/ui.tsx`):** `Button` (primary/secondary/
  ghost/danger), `Input`/`Select`/`Textarea`, `Label`/`Field`, `Card`,
  `Badge` (muted text-only pills), `PageHeader`, `BannerHeader` (flat
  card with a 3px `brand-700` left accent — never a gradient),
  `ErrorBox`, `EmptyState` (small icon + real copy), `Loading`
  (spinner), `Modal` (overlay `black/60`, Esc closes).
- **Shell (`components/AppShell.tsx`):** sidebar section labels 11px
  uppercase; active nav item gets a `brand-50` background plus a 3px
  `brand-600` left bar; sidebar footer carries the "TeachNest • v3.0.0"
  wordmark. Tables (see `components/CrudPage.tsx`): sticky header row,
  12px uppercase header cells, 13px body, row hover, right-aligned
  numerics, status as dot + muted pill.
- **Dark mode:** class-based (`dark` on `<html>`, persisted as
  `cw_theme` in localStorage). Every new surface needs its `dark:`
  variant from the warm stone scale — never rely on inverted grey.
