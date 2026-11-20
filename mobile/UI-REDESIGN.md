# TeachNest Student App — UI Redesign Spec (v4.0)

> DESIGN FIRST, then implement. This spec is the single source of truth for the
> redesign. All screens keep their existing functionality, API calls, labels
> and copy EXACTLY as-is — visual + motion redesign only. No new screens, no
> removed screens, no fake data, no invented stats. All UI text stays English
> only. White-label theming still comes from `config/brand.ts` alone.

## 1. Design language

**"Calm classroom, modern consumer app."** The app should feel like a polished
ed-tech product (Unacademy / BYJU'S-class polish, not a form dump): warm paper
background, white cards with soft shadows, one deep-navy primary, amber used
sparingly as the accent. Flat, clean, human — **no gradients, no rainbow
colours, no glassmorphism**, same family as the TeachNest web admin.

- Surfaces: warm slate background, white cards, 1px stone borders.
- Depth: soft shadows only (`shadowOpacity 0.06–0.08`, `elevation 2–3` on
  cards, `elevation 6` on the primary CTA when pressed is NOT used — shadows
  stay subtle). No heavy drop shadows, no neon.
- Imagery: no photos/stock images. Course/live placeholders are solid
  `primaryDark` blocks with a large Ionicon + the course initial — never a
  raw URL or the words "Course thumbnail" as the visual.
- Icons: **Ionicons** (`@expo/vector-icons`, installed v15.1.1) throughout —
  no emoji, no text glyphs (▶/▸/⏱ are replaced by icons). One muted tone
  per screen; active/primary state uses `primary`.
- Feedback honesty: all existing demo/placeholder labels stay verbatim
  (`Demo OTP — SMS not configured by the institute.`,
  `DEMO — live video is not connected yet (Phase 4).`, `Live video placeholder`,
  `Payments not configured yet`). They are restyled, never removed or
  reworded.

## 2. Colour tokens (`config/theme.ts` — single source of truth)

Derived from `config/brand.ts` (brand.ts stays the white-label file: name,
org code, colours). `theme.ts` imports `brand` and derives everything else —
**no screen hardcodes a colour**.

| Token | Value | Use |
|---|---|---|
| `primary` | `brand.primaryColor` `#312e81` | Primary buttons, active tab, links, selected states |
| `primaryDark` | `brand.primaryDark` `#1e1b4b` | Auth header band, course banner, live placeholder |
| `primarySoft` | `#eef2ff` (indigo-50) | Selected option bg, active chip bg, icon tile bg |
| `primarySoftText` | `#312e81` | Text on `primarySoft` |
| `accent` | `brand.accentColor` `#f59e0b` | Free Preview pill, progress fill, stars/points of emphasis ONLY |
| `accentSoft` | `#fef3c7` | Amber banners (demo OTP, demo live) bg |
| `accentSoftText` | `#92400e` | Text on amber banners |
| `background` | `#f8fafc` | Screen background |
| `surface` | `#ffffff` | Cards, inputs, tab bar |
| `surfaceMuted` | `#f1f5f9` | Pressed/hover fill, skeleton base |
| `text` | `#0f172a` | Headings, body |
| `muted` | `#64748b` | Secondary text, captions |
| `border` | `#e2e8f0` | Card/input borders |
| `success` / `successSoft` / `successSoftText` | `#16a34a` / `#dcfce7` / `#166534` | Live-configured banner, success states |
| `danger` / `dangerSoft` | `#dc2626` / `#fee2e2` | Errors, destructive actions |
| `white` | `#ffffff` | Text on primary |

## 3. Typography scale (system font — no custom font dependency)

| Style | Size / Weight / Line-height | Use |
|---|---|---|
| `display` | 28 / 700 / 34 | Auth logo, greeting name line |
| `title` | 22 / 700 / 28 | Screen titles |
| `section` | 17 / 700 / 22 | Section headers |
| `heading` | 16 / 700 / 22 | Card titles |
| `body` | 14 / 400 / 20 | Body text, descriptions |
| `bodyBold` | 14 / 700 / 20 | Emphasised body |
| `caption` | 12 / 500 / 16 | Meta text, timestamps |
| `captionBold` | 12 / 700 / 16 | Pills, badges |
| `button` | 16 / 700 | Primary button label |
| `price` | 18 / 700 | Price lines |

Numbers that animate/count use `tabular-nums` behaviour (monospace digits are
not available in RN by default — keep `fontVariant: ['tabular-nums']` where
supported, harmless otherwise).

## 4. Spacing / radius system (4-pt grid)

- Screen padding: **20** horizontal (was 16), 16 top.
- Card padding: **16**; card gap: **12**; section gap: **24** between sections.
- Radius: cards **16**, buttons **12**, inputs **12**, chips/pills **999**,
  icon tiles **12**, banners **12**, course banner **16**.
- Touch targets: minimum **44pt** height for buttons, list rows, tab items.
- Icon tile: **40×40** (list rows), **48×48** (section hubs), **56×56**
  (profile avatar), **72×72** (empty-state icon circle).

## 5. Shared components (`components/ui.tsx` + `components/motion.tsx`)

Extend the existing `components/ui.tsx` (keep `PrimaryButton`, `Loading`,
`Empty`, `ErrorBox`, `Card` APIs compatible) and add:

- **`PressableCard`** — `Pressable` wrapping a card: `scale 0.97` while
  pressed (Animated, 150ms), soft shadow, radius 16. All tappable list
  rows use this instead of a plain `Card` + `onPress`.
- **`Skeleton`** — shimmering placeholder bars (Animated opacity loop,
  900ms) in `surfaceMuted`; `SkeletonCard` for list loading states.
  `Loading` keeps the spinner for full-screen loads; lists use skeletons.
- **`Chip`** — pill (`radius 999`, padding 10×6): `default` (surfaceMuted bg,
  muted text), `primary` (primarySoft bg, primary text), `amber`
  (accentSoft bg, accentSoftText text), `green`, `danger`.
- **`SectionHeader`** — section title + optional right-side action link
  (`See all →` style, primary, 13px/700).
- **`IconTile`** — rounded square (40/48) with `primarySoft` bg + primary
  Ionicon, or `accentSoft`/`successSoft` variants. Course tiles show the
  course initial in white on `primaryDark` instead of an icon.
- **`Avatar`** — circle with initials, `primaryDark` bg, white 700 text.
- **`Banner`** — coloured info strip (amber/green/red variants) with icon +
  title + body, radius 12. Replaces inline coloured Views.
- **`ProgressBar`** — 6px track (`surfaceMuted`) + animated fill
  (`primary` or `accent`), width animated 0→value on mount (300ms).
- **`StatCard`** — small card: caption label (11px uppercase, muted),
  value (22px/700), optional icon tile.
- **`motion.tsx`** — `FadeIn` (opacity 0→1 + translateY 8→0, 250ms,
  `delay` prop for stagger), `PressScale` (wraps children, scale 0.97 on
  press-in, 150ms), `useStaggeredEntrance(count)` helper for FlatList
  items (delay = `min(index, 8) * 40ms`). All animations use the native
  driver where possible (`useNativeDriver: true` for opacity/transform).

## 6. Motion principles

- Durations **150–350ms**, `ease-out` only. No bounce, no spring, no
  auto-playing carousels.
- Screen transitions: Expo Router defaults (native stack slide). Tab
  switches: no custom animation (native tab bar).
- Press feedback on EVERY tappable element (scale 0.97 or opacity 0.7).
- Lists: items fade+slide in staggered on first mount only (not on every
  re-render — gate with a `useRef` "has animated" flag per list).
- Pull-to-refresh: `RefreshControl` (primary tint) on Home, Courses,
  Tests, Live, Assignments, Profile sub-lists — calls the existing
  `reload()` from `useApi`. No new API calls.
- Reduced motion: there is no OS-level reduced-motion API reliably
  available in this RN version — keep all animations short and subtle so
  they are never disorienting; never animate anything longer than 350ms.

## 7. Per-screen design

### 7.1 OTP login / register — `(auth)/login.tsx`, `(auth)/otp.tsx`
- Top: full-width `primaryDark` header band (height ~200) with large white
  logo text (institute name, 28/700), tagline in indigo-200, and a small
  amber accent underline bar (4×48). Content card overlaps the band
  (negative margin, radius 20, elevation 4) — the classic modern auth look.
- Inputs: 56pt tall, radius 12, 1px border, focused border = `primary`
  (track focus state per field), label above (13/700, muted), generous
  12px gaps. Phone input with `+91` prefix chip inside the field row.
- OTP screen: 6-box OTP input stays a single `TextInput` (do not rebuild
  as 6 boxes — keep behaviour), centred, `letterSpacing 8`, 22px font.
  Demo banner → `Banner` amber variant with `information-circle` icon.
  SMS-sent banner → green variant with `checkmark-circle` icon.
- Primary button: full-width, height 52, radius 12, primary bg, white
  16/700 label, pressed scale 0.98 + opacity. Footnote centred muted 12px.
- Keep ALL copy, validation messages, demo OTP value display and flows.

### 7.2 Home — `(tabs)/index.tsx`
- Header (in-scroll, not native header): greeting row — `Avatar` with
  initials + `Hello, {name}` (20/700) + subtitle `Welcome back to
  {institute} — {tagline}` (13 muted). Right side: notification bell
  icon button (navigates to Profile → Notifications section) with a dot
  when notifications exist (no unread state in API — dot shows when the
  notifications list is non-empty; do not claim "unread").
- Search bar (decorative, non-functional search is NOT added — instead the
  bar is a tappable row that navigates to Courses tab, placeholder
  `Search courses…`, search icon). This reuses the existing Courses
  client-side filter; it does not invent a search API.
- Banners: horizontal paging carousel of announcement cards — `primaryDark`
  bg, white title, amber accent bar, `megaphone` icon, snap-to-item,
  dot indicators. (Existing data only; empty state unchanged.)
- `Continue Learning` — NEW section header only if the student has
  courses (`my-courses` is already fetched on Profile, NOT here — do NOT
  add a new API call; instead derive from `featured_courses`? No. **Skip
  Continue Learning** — it would need data this screen does not fetch.
  Keep the existing sections.)
- Sections (existing order): Featured Courses, Test Series, Current
  Affairs, Latest Jobs, Toppers, What students say. Each with
  `SectionHeader` + horizontal scroll row of compact cards (course cards
  240 wide: initial tile, title 2-line clamp, price row) OR vertical list
  — horizontal rows for courses/tests, vertical compact rows for affairs/
  jobs/toppers/testimonials. Course/test cards are `PressableCard`s.
- Toppers: rank badge (gold/silver/bronze circle for ranks 1/2/3 — amber,
  slate-300, amber-700 tones) + name + score chip.
- Testimonials: quote card with large quote mark, italic-ish body, `— name`.
- Pull-to-refresh + skeleton list on first load.

### 7.3 Courses list — `(tabs)/courses.tsx`
- Search field at top (sticky within the list header): 48pt, radius 12,
  search icon left, clear (x) button when text present. Existing
  client-side filter unchanged.
- Course cards: `PressableCard` — left: 64×64 initial tile (primaryDark,
  white initial, radius 12); right: title (16/700, 2 lines), description
  (13 muted, 2 lines), price row (price 16/700 primary + struck MRP
  muted), `Validity: {n} days` chip when set. Chevron-right icon.
- Staggered entrance, skeleton cards while loading, empty state with
  `book-outline` icon in a 72px circle + message.

### 7.4 Course detail — `course/[id].tsx`
- Header banner: 200px `primaryDark` block, radius 16 — big initial tile
  (72px, white initial on translucent white bg) + title (20/700 white,
  centred-left) + category chip (translucent white pill). Replaces the
  "Course thumbnail" text block (that literal text is removed from the
  visual; no fake image).
- Price card: price (20/700 primary) + struck MRP + validity chip +
  `Buy Now` primary button (52pt) — all in one white card. Purchase flow,
  alerts, order card and verify flow UNCHANGED (copy + logic identical).
- `About this course` card: description, 14/20.
- `Course Content` card: subjects as accordion rows — subject row:
  icon tile (`folder` icon) + name (15/700) + meta
  `{n} topics · {n} videos` (12 muted) + chevron that rotates 90° on
  expand. Topics: indented rows with `list` icon. Video rows: play-circle
  icon (primary), title, duration chip (`M:SS`), `Free Preview` amber
  chip. Tap opens video (existing behaviour). Expand/collapse animates
  (opacity + height via `LayoutAnimation`? No — use Animated height
  interpolation is fragile; use simple conditional render + `FadeIn` on
  the expanded block, 200ms).
- Teachers row: `Teacher IDs: 1, 2` becomes a muted caption row with a
  `people` icon (data unchanged — names are not in the API).
- Drip/sequential flags: small chips row instead of a text card.
- Sticky bottom CTA: `Buy Now` button pinned at the bottom of the screen
  (above tab bar) when the course is not purchased — same handler as the
  price-card button. (Only visual placement; logic identical.)

### 7.5 Learn hub + section lists — `(tabs)/learn.tsx`, `learn/[section].tsx`
- Hub: 5 rows — 48px `IconTile` (distinct Ionicon per section:
  `play-circle` videos, `document-text` notes, `book` syllabus,
  `newspaper` papers, `library` e-books) + title (16/700) + subtitle
  (13 muted) + chevron. `PressableCard` rows, staggered entrance.
- Section list: same `PressableCard` rows; title + description + subject
  chip when present; file rows get a `document`/`play` icon by kind and
  the URL shown as a truncated muted caption (unchanged — still not
  tappable, per existing behaviour). Skeleton rows while loading.

### 7.6 Tests — `(tabs)/tests.tsx`, `test/[id].tsx`, `test/result.tsx`
- Segmented control: pill container (`surfaceMuted` bg, radius 999) with
  two options; active pill = white bg + shadow + primary text (iOS-style
  segmented control), sliding feel via background change (no layout
  animation lib). Labels unchanged: `Test Series` / `Score Sheet`.
- Test cards: title + description + meta row (`{n} questions` when known
  — only after opening; do NOT invent: list shows title/description
  only, as today) + `Start Test →` primary link row with arrow icon.
- Score cards: test title + big score `score / total` (18/700 primary)
  + `Correct: x/y` chip + date caption (format the ISO date to a short
  readable date — display formatting only, e.g. `12 Nov 2026`).
- **Test-taking screen**: top progress bar (answered/total, primary
  fill, animated width) + timer chip (`timer` icon + `MM:SS`, primary
  text) + `Question {n} of {total}` caption. Question in a white card
  (16/20). Options: full-width rows, letter badge (A–D circle, 28px) +
  text; selected = `primarySoft` bg + primary border + primary letter
  badge (no white-on-indigo fill — softer, modern). Press scale 0.98.
  Bottom nav: `Previous` (secondary outline button) / `Next` / `Submit
  Test` (primary, 52pt). `Answered: n/total` becomes a small progress
  caption above the nav. Confirm-submit uses the existing flow (no new
  confirm dialog — keep behaviour identical).
- **Result screen**: centred celebration card — big score ring: a 160px
  circle with `primarySoft` bg, score `36px/800` primary centred +
  `out of {total}` caption; `Correct: x of y` chip row; a
  `ProgressBar` showing score/total (accent fill); `Back to Tests`
  primary button. No confetti, no invented messages.

### 7.7 Assignments — `(tabs)/assignments.tsx`
- Two sections with `SectionHeader`s. Cards: title + description + due
  chip (`calendar` icon + `Due: {date}` — format date short, display
  only) + status chip (green `Submitted`/amber `Pending` — status comes
  from API; if no status, show no chip, do not invent) + score chip when
  not null.
- Video assignment: answer input (multiline, minHeight 90, radius 12)
  + `Submit` primary button (full-width, 48pt). After submit: success
  alert (existing) + list reload (existing).
- Test assignment: `Mark as Complete` primary button (label stays
  `Submit` — copy unchanged).

### 7.8 Live — `(tabs)/live.tsx`, `live/[id].tsx`
- Status banner → `Banner` component (green: `videocam` icon,
  `Live classes are hosted on {provider}.`; amber: `information-circle`,
  demo text verbatim).
- Seminar cards: `PressableCard` — date tile (day number 20/700 +
  month short, primarySoft bg, 56×64) + title + description + scheduled
  time caption + `Join Live Class →` primary link row.
- Join screen: if configured, green banner + `Join Live Class` primary
  button (52pt); if not, amber banner (verbatim demo text) + placeholder
  block: 200px `primaryDark` rounded block with large `videocam-off`
  icon + `Live video placeholder` white text. All copy/logic unchanged.

### 7.9 Profile — `(tabs)/profile.tsx`
- Header card: `Avatar` (56px, initials) + name (20/700) + `+91 {phone}`
  + email + city/state captions. No cover photo.
- Menu rows (replace the four stacked PrimaryButtons): `PressableCard`
  rows with icon tiles (`book` My Courses, `receipt` My Orders,
  `notifications` Notifications, `help-circle` Help & Support) + title
  + chevron. Log Out becomes a red-outline row (`log-out` icon, danger
  text) at the bottom.
- Sub-sections keep the `← Back to Profile` button (now an icon+text
  row). My Courses: course rows (initial tile + title + description).
  My Orders: order cards with status chip (green SUCCESS / amber PENDING
  / red other — derived from API status string) + `Check Payment Status`
  secondary button. Notifications: bell icon tile + title + body.
  Help & Support: enquiry card + input + `Submit Enquiry` primary.
- **Settings/debug card**: keep the same information (API URL,
  Institute, Theme, App version) but restyle as a muted caption list
  under a `Settings` section header — it is debug info, so it stays
  visually quiet (12px muted, monospace-ish values). Do not remove it.
- Pull-to-refresh on sub-lists.

### 7.10 Tab bar + app chrome — `(tabs)/_layout.tsx`, `_layout.tsx`
- Tab bar: white bg, 1px top border, height 60 + safe-area, active tint
  `primary`, inactive `muted`. Ionicons per tab: Home `home`, Courses
  `book`, Learn `play-circle`, Tests `clipboard`, Live `videocam`,
  Assignments `create`, Profile `person`. Labels 11px/600. No badges.
- Stack header: keep indigo header bg + white bold title (unchanged
  visual identity), but add `headerShadowVisible: false` and a subtle
  bottom border via `headerStyle` borderBottomWidth 0 — flat, modern.
- StatusBar: dark content on light screens (existing `style="dark"`).

## 8. What is NOT changing

- Every API call, endpoint, payload and response handling.
- Every label, button text, alert, validation message and empty-state
  string (except the literal `Course thumbnail` text inside the coloured
  banner, which is replaced by a proper initial tile — the banner still
  shows no image).
- Navigation structure (7 tabs, same order, same routes, same params).
- Auth flow, OTP demo behaviour, Cashfree purchase/verify flow, test
  scoring (server-side), assignment submit behaviour.
- `brand.ts` values (name, org code, colours) — rebrand still = edit
  `brand.ts` (+ app.json name/slug) only.
- No new screens, no new dependencies beyond `@expo/vector-icons`
  (already installed for this redesign), no backend changes.

## 9. Verification checklist

- `npx tsc --noEmit` passes.
- `npx expo export --platform android` succeeds (use `--no-bytecode`
  if the VM needs it).
- `npx expo-doctor` shows no new errors.
- `grep -r gradient` over changed files = 0.
- No on-device run is possible in the VM — on-device check (Android
  phone, after EAS APK build) must confirm: tab icons render, press
  feedback feels right, skeleton states appear, no text clipping at
  small widths, pull-to-refresh works.
