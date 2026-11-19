# TeachNest — Student Mobile App (Phase 3)

React Native + Expo (TypeScript, Expo Router) student app for TeachNest.
All data comes from the TeachNest student API — no hardcoded mock data in screens.

## Demo student credentials

| Field | Value |
|---|---|
| Org code | `DEMO0001` (prefilled on the login screen) |
| Mobile | any 10-digit number, e.g. `6203094055` |
| OTP | `123456` (always, demo mode — no SMS is sent) |
| Name | required on first registration (asked on the OTP screen) |

## How to run

```bash
cd mobile
npm install
# Local backend (default is the live API):
EXPO_PUBLIC_API_URL=http://localhost:8000/api npx expo start
# Live backend (default, no env var needed):
npx expo start
```

- **Expo Go (phone):** install Expo Go, scan the QR code from `npx expo start`.
- **Android emulator / iOS simulator:** press `a` / `i` in the Expo terminal.
- **Web preview:** `npx expo start --web` (layout only; mobile-first app).

API base URL is set via `EXPO_PUBLIC_API_URL` and defaults to
`https://teachnest-api.onrender.com/api` (see `lib/api.ts`).

## Screens

- **Auth:** Login (org code + 10-digit mobile → OTP) → OTP (6 boxes, demo notice, name on first login).
- **Home tab:** greeting, banners, featured courses, test series, current affairs, jobs, toppers, testimonials.
- **Courses tab:** list + search → course detail (MRP/price, validity, description, teachers) → Buy Now → demo purchase dialog ("Demo purchase — no real payment") → access granted.
- **Learn tab:** Recorded Classes (YouTube playlist videos), Notes & Docs, Syllabus, Previous Papers, E-Books.
- **Tests tab:** test series list → attempt (one question at a time, timer, submit) → result screen with score → Score Sheet (my scores).
- **Live tab:** seminars list → Join Live Class screen, clearly labelled "DEMO — live video is not connected yet (Phase 4)".
- **Assignments tab:** video + test assignments, submit text answer, view status/scores.
- **Profile tab:** profile, My Courses, My Orders, Notifications, Help & Support (submit enquiry), Settings (API URL, theme info), Logout.

Auth token persists in AsyncStorage (`AuthContext`); every list screen has loading / empty / error states.

## White-label / rebrand

Change **only** these two places:

1. `config/brand.ts` — `appName`, `instituteName`, `orgCode`, `tagline`, `logoText`, `primaryColor`, `primaryDark`, `accentColor`. Every screen reads branding from this file; no screen hardcodes the institute name or colours.
2. `app.json` — `expo.name` and `expo.slug` (and `android.package` / `ios.bundleIdentifier` for store builds).

No other file needs editing to rebrand.

## Verify

```bash
npm run typecheck   # npx tsc --noEmit
npx expo export --platform android --no-bytecode   # static export into dist/
```

Verified 20 Nov 2026: `tsc --noEmit` passes (exit 0); `expo export --platform
android --no-bytecode` succeeds (dist/_expo/static/js/android/entry-*.js, 1.63 MB).
Plain `npx expo export` (default, all platforms incl. web) fails because
`react-native-web` is not installed — install it if web export is wanted.
Default Android export with Hermes bytecode fails in this VM's hermesc on
React Native's own `ImageProps.js` private fields (`private properties are not
supported`) — a toolchain issue, not app code (the app uses no private fields);
`--no-bytecode` and `--dev` exports both succeed, and `npx expo-doctor` passes
18/18 checks.

## Notes / verified against the real API

- The Phase 3 student API landed in `backend/app/routers/student.py` while this
  app was being built. Verified end-to-end against a **local** backend run
  (SQLite, port 8000) on 20 Nov 2026: request-OTP → `{"demo_otp":"123456"}`,
  verify → 204-char JWT, then `/student/me`, `/home` (3 banners, 5 featured
  courses, 2 test series, 3 current affairs, 2 jobs, 2 toppers, 2 testimonials),
  `/courses`, `/videos`, `/notes`, `/previous-papers`, `/ebooks`, `/syllabus`,
  `/test-series` + detail (3 questions, no correct answers), purchase
  (`DEMO-3A85F7A7`, SUCCESS, ₹1999), attempt (`score 0.5/3.0, correct 1/3`),
  `/scores`, video + test assignment submits, `/seminars`, `/notifications`,
  `/teachers`, `/bundles`, `/enquiries`, `/my-courses` (course appears after
  purchase) — all returned 200 with the shapes the app expects.
- **Live backend not yet verified:** `GET https://teachnest-api.onrender.com/api/student/home`
  still returns 404 `{"detail":"Not Found"}` — the Phase 3 API is not deployed
  live yet. The app defaults to that live URL, so on a phone it will show
  error states until the backend deploys; point it at a local backend with
  `EXPO_PUBLIC_API_URL=http://localhost:8000/api` (Android emulator: use
  `http://10.0.2.2:8000/api`) to test now.
- Minor real-API field differences vs the brief, handled in `lib/api.ts`:
  banners use `name` (not `title`), courses use `category_id` (number),
  scores use `chapter_test` as the test title, bundles use `name`.
- Live video is Phase 4 — the Live tab is a labelled demo placeholder.
- No native modules beyond Expo defaults; no payment SDK (demo purchase only).
