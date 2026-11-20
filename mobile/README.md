# TeachNest — Student Mobile App (Phase 4)

React Native + Expo (TypeScript, Expo Router) student app for TeachNest.
All data comes from the TeachNest student API — no hardcoded mock data in screens.

## Demo student credentials

| Field | Value |
|---|---|
| Org code | `DEMO0001` (prefilled on the login screen) |
| Mobile | any 10-digit number, e.g. `6203094055` |
| OTP | `123456` when the institute has not configured SMS (demo OTP — the OTP screen says so); otherwise the OTP is sent via SMS |
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

- **Auth:** Login (org code + 10-digit mobile → OTP) → OTP (6-digit code; the screen says "Demo OTP — SMS not configured by the institute" when the backend reports a demo OTP, or "OTP sent via SMS" when a real SMS was sent; name on first login).
- **Home tab:** greeting, banners, featured courses, test series, current affairs, jobs, toppers, testimonials.
- **Courses tab:** list + search → course detail (MRP/price, validity, description, teachers) → Buy Now → real Cashfree payment (see "Payments (Phase 4 — Cashfree)" below) → Verify Payment → access granted on PAID.
- **Learn tab:** Recorded Classes (YouTube playlist videos), Notes & Docs, Syllabus, Previous Papers, E-Books.
- **Tests tab:** test series list → attempt (one question at a time, timer, submit) → result screen with score → Score Sheet (my scores).
- **Live tab:** seminars list → Join Live Class screen. Calls `GET /api/live/config`: when no provider is configured it keeps the Phase 3 label "DEMO — live video is not connected yet (Phase 4)"; when a provider is configured it shows the provider name and a Join button that opens the join URL supplied by the backend (never an invented URL).
- **Assignments tab:** video + test assignments, submit text answer, view status/scores.
- **Profile tab:** profile, My Courses, My Orders (each order has a "Check Payment Status" button that calls `GET /api/student/payments/{order_id}`), Notifications, Help & Support (submit enquiry), Settings (API URL, theme info), Logout.

Auth token persists in AsyncStorage (`AuthContext`); every list screen has loading / empty / error states.

## Payments (Phase 4 — Cashfree)

The Phase 3 demo purchase is gone — there is no `DEMO-<id>` success path
anywhere in the app. Buying a course (and, via the same client function, a
bundle) uses the real Cashfree flow:

1. Course detail → **Buy Now** → confirm → `POST /api/student/payments/create-order`
   `{ item_type: "course" | "bundle", item_id }`.
2. The backend returns `{ order_id, cashfree_order_id, payment_session_id,
   payment_link, amount }`. The app opens `payment_link` in the in-app
   browser (`expo-web-browser`, `lib/openLink.ts`; system browser as fallback).
   Only a link the backend returned is ever opened.
3. After paying, the student taps **Verify Payment** → `POST /api/student/payments/verify`
   `{ order_id }`. `PAID` → success + course detail reloads (My Courses is
   re-fetched when the profile opens); `PENDING` → asked to wait and verify
   again; `FAILED` → can pay again. The order card also offers
   "Open Payment Page Again".
4. **My Orders** (Profile tab) shows the recorded order status and a
   "Check Payment Status" button per order → `GET /api/student/payments/{order_id}`.

If Cashfree is not configured, the backend returns **503** and the app shows
"Payments not configured yet — please contact your institute" — never a fake
SUCCESS order. If the payment endpoints are not deployed yet (404), the app
says payments are not available yet and asks the student to contact the
institute.

Typed client functions live in `lib/api.ts`: `createPaymentOrder`,
`verifyPayment`, `getPayment`, `liveConfig`.

### Environment / secrets

- `EXPO_PUBLIC_API_URL` is unchanged — it only sets the API base URL and
  defaults to `https://teachnest-api.onrender.com/api` (see `lib/api.ts`).
- **No secrets in the app.** No Cashfree key, secret, or token is stored,
  hardcoded, or shipped in the mobile app — Cashfree credentials live only on
  the backend. The app only ever handles the `payment_session_id` /
  `payment_link` the backend returns for one order.

## Push notifications (Phase 4)

No code change in this phase and no fake push implementation. Push arrives
via FCM when the institute has it configured on the backend; until then the
Notifications tab in the Profile screen shows the in-app notifications from
`GET /api/student/notifications`.

## White-label / rebrand

Change **only** these two places:

1. `config/brand.ts` — `appName`, `instituteName`, `orgCode`, `tagline`, `logoText`, `primaryColor`, `primaryDark`, `accentColor`. Every screen reads branding from this file; no screen hardcodes the institute name or colours.
2. `app.json` — `expo.name` and `expo.slug` (and `android.package` / `ios.bundleIdentifier` for store builds).

No other file needs editing to rebrand.

## Android APK

**Status (20 Nov 2026, ~06:36 IST): APK BUILT — download ready.**

- **Build:** EAS Build `71f19375-66e1-4d6a-93b4-3316d1ec16b1` — status `FINISHED`, all 17 steps passed, build time 9m 32s, completed 2026-11-20 00:49 UTC. Started from the Expo website ("Build from GitHub", Android, preview profile, Git ref `main`, commit `2841056`).
- **Phase 4 note:** the APK above is the Phase 3 build. The Phase 4 changes
  (Cashfree purchase, live config, OTP copy) are in the working tree only and
  have NOT been built into a new APK yet — no EAS build was run for Phase 4.
  Rebuild with Option A below to ship them.
- **Build page:** https://expo.dev/accounts/gautam825406/projects/teachnest-app/builds/71f19375-66e1-4d6a-93b4-3316d1ec16b1
- **APK download link:** https://expo.dev/artifacts/eas/L2Jk3Jyc25bu5oE-fo1HI3GtBjawkIwqPOEdALpbR4M.apk
- **Local copy:** `teachnest-preview.apk` in this folder — 65,367,074 bytes (62.3 MB), SHA-256 `fba1eb805bc95a714c0bd7f0c7c4e93a717e90042d7030ee812b2f57eefdba2e`.
- **Verified with aapt2:** package `com.teachnest.app`, versionCode `1`, versionName `3.0.0`, label `TeachNest`, target SDK 36. Backend is the live API (`https://teachnest-api.onrender.com/api`).

### Option A — EAS Build (recommended, works from anywhere)

`eas.json` is already in this folder with a `preview` profile
(`android.buildType: apk`, `EXPO_PUBLIC_API_URL` set to the live backend).
EAS CLI is logged in as `gautam825406` and the project is linked:
EAS project `@gautam825406/teachnest-app`, project ID
`b57833fc-5024-4585-933f-b004599cd353`
(https://expo.dev/accounts/gautam825406/projects/teachnest-app),
remote Android credentials managed by Expo. The command is:

```bash
cd mobile
eas build --platform android --profile preview --non-interactive --wait
```

EAS builds in the cloud and gives a download link for the APK
(`app-release.apk`, package `com.teachnest.app`, version 3.0.0).
Install it on a phone by opening the link on the phone, or download the APK
to a computer and run `adb install app-release.apk`.

**EAS Build attempt from this VM (20 Nov 2026) — BLOCKED, environmental:**
`eas build` consistently exits with code 0 a few seconds after the
"Using remote Android credentials" step, before any build is created
(`eas build:list` shows zero builds). Two blockers were found and fixed
along the way: (1) no git repo existed, so `eas build` refused — fixed by
`git init` in `~/workspace/teachnest/`; (2) `eas init` had modified
`app.json` without committing, so the build's "commit required" check
exited silently in non-interactive mode — fixed by committing it.
After both fixes the CLI still dies at the same point. `strace` shows
Node worker threads segfaulting (`SIGSEGV`, `SEGV_MAPERR`, NULL address)
on nscd socket lookups right after the credentials step, then the main
process exits 0 — the same sandbox behaviour that broke the local Gradle
daemon earlier. This is a VM/sandbox limitation, not an app-code problem.
**Workaround: start the build from the Expo website instead** — open
https://expo.dev/accounts/gautam825406/projects/teachnest-app in a browser
(signed in as gautam825406), go to Builds → Create a build, choose
Android + preview profile. Or run the same `eas build` command above on a
normal dev machine (Windows/Mac/Linux) where it works.

### Option B — Local Gradle build (needs a full Android toolchain)

```bash
# 1. Install OpenJDK 17 and the Android SDK (cmdline-tools, platform-tools,
#    platforms;android-35, build-tools;35.0.0). Set ANDROID_HOME to the SDK.
# 2. From this folder, with the live API URL:
EXPO_PUBLIC_API_URL=https://teachnest-api.onrender.com/api npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

**Local build attempt (20 Nov 2026, this VM) — FAILED, environmental:**
JDK 17 + Android SDK 35 were installed successfully and `expo prebuild`
succeeded, but every Gradle invocation fails with
`Could not receive a message from the daemon` / `Unexpected type tag 109`
— the Gradle client cannot talk to its own daemon on loopback in this
sandbox, even with a manually installed Gradle 8.14.3, reduced heap
(`-Xmx1024m`), and proxy settings removed. The Gradle wrapper also cannot
download through this VM's authenticated egress proxy (Java
`HttpURLConnection` tunneling fails with `NoSuchElementException`), so the
wrapper was bypassed by installing Gradle directly. This is a VM/toolchain
limitation, not an app-code problem (`tsc`, `expo-doctor` 18/18 and the
`expo export --no-bytecode` all pass). Use Option A, or run Option B on a
normal dev machine (Windows/Mac/Linux with Android Studio).

### Install the APK on a phone

1. On the phone, allow "Install unknown apps" for the browser / file manager
   when asked (the APK is not from the Play Store).
2. Open the APK file and tap Install.
3. Open TeachNest, enter org code `DEMO0001`, a 10-digit mobile, and the OTP
   shown on the OTP screen (`123456` while SMS is not configured; otherwise
   the OTP sent via SMS). The app talks to the live backend
   `https://teachnest-api.onrender.com/api` — the first request can take
   ~50 seconds because the free Render backend sleeps when idle.

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

Phase 4 verified 20 Nov 2026 (`tsc --noEmit` exit 0; no EAS build run):
against a local backend (scratch SQLite DB, port 8001, Cashfree unconfigured),
`POST /api/student/auth/request-otp` returns `{"demo": true, "demo_otp":
"123456", ...}` and verify returns a 204-char JWT; `POST
/api/student/payments/create-order` and `POST /api/student/payments/verify`
both return **503 `{"detail": "Cashfree not configured"}`** — the app shows
"Payments not configured yet — please contact your institute" for that case;
`GET /api/student/payments/{unknown-id}` returns 404. Note: `GET
/api/live/config` returns **401 with a student token** — it is currently an
admin-only endpoint (see "Notes" below), so the Live tab keeps the DEMO label
until the backend exposes a student-scoped live config. No real Cashfree
payment has been tested end to end yet — that needs Cashfree configured on the
backend plus a real payment.

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
- Live video is Phase 4 — the Live tab calls `GET /api/live/config` and shows
  the provider + Join button when configured, otherwise the labelled demo
  placeholder. **Backend gap (verified 20 Nov 2026):** `GET /api/live/config`
  currently requires an admin token (`get_current_user`) and returns 401 for a
  student token, so the app can never see a configured provider until the
  backend adds a student-scoped live-config endpoint (e.g.
  `GET /api/student/live/config`) or allows student tokens on `/api/live/config`.
  The app deliberately does NOT call any other endpoint for this — it treats
  the failure as "unconfigured" and keeps the DEMO label.
- Cashfree checkout opens in the in-app browser (`expo-web-browser`); no
  payment SDK and no keys in the app (see "Payments (Phase 4 — Cashfree)").
