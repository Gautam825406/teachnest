export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

export interface AuthUser {
  id: number | string;
  username: string;
  email: string;
  role: string;
  tenant_id?: number | string;
  tenant_name?: string;
  org_code?: string;
}

export interface DashboardStats {
  todays_earnings?: number;
  recently_joined?: number;
  total_earnings?: number;
  total_classes_taken?: number;
  total_courses?: number;
  total_students?: number;
  total_teachers?: number;
  total_orders?: number;
  video_storage_mb?: number;
  video_storage_limit_gb?: number;
  storage_plan?: string;
  wallet_balance?: number;
  payment_gateway?: { provider?: string; status?: string; merchant_id?: string };
}

export interface Course {
  id: number | string;
  title: string;
  mrp?: number;
  price?: number;
  validity_days?: number;
  description?: string;
  category_id?: number | string | null;
  subcategory_id?: number | string | null;
  test_series_ids?: (number | string)[];
  position?: number;
  video_order?: string;
  thumbnail_url?: string;
  syllabus_url?: string;
  telegram_paid?: string;
  telegram_free?: string;
  whatsapp?: string;
  show_in_app?: boolean;
  drip_content?: boolean;
  sequential_learning?: boolean;
  block_payment?: boolean;
  max_validity?: string | null;
  teacher_ids?: (number | string)[];
}

export interface Category { id: number | string; name: string }
export interface Subcategory { id: number | string; name: string; category_id: number | string }

export interface Teacher {
  id: number | string;
  name: string;
  subject?: string;
  email?: string;
  phone?: string;
  experience_years?: number;
  display_weight?: number;
  tagline?: string;
  quote?: string;
  categories?: (number | string)[] | string;
  biography?: string;
  photo_url?: string;
  is_active?: boolean;
}

export interface Student {
  id: number | string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  masked_phone?: string;
  city?: string;
  state?: string;
  signup_date?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Order {
  id: number | string;
  student_name?: string;
  student?: string | { name?: string };
  contact?: string;
  phone?: string;
  email?: string;
  status?: string;
  transaction_id?: string;
  date?: string;
  created_at?: string;
  amount?: number;
  total_amount?: number;
  items?: unknown;
  [key: string]: unknown;
}

export interface Role {
  id: number | string;
  name: string;
  is_system_default?: boolean;
  permissions?: string[];
}

export interface Settings {
  company_name?: string;
  email?: string;
  phone?: string;
  support_technical?: string;
  support_general?: string;
  support_billing?: string;
  headquarters?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  youtube?: string;
  gst_rate?: number | string;
  gstin?: string;
  about_us?: string;
  privacy_policy?: string;
  refund_policy?: string;
  terms?: string;
  [key: string]: unknown;
}

export interface Paged<T> { items: T[]; total: number }

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cw_token");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("cw_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem("cw_token", token);
  localStorage.setItem("cw_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("cw_token");
  localStorage.removeItem("cw_user");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.headers) {
    Object.entries(options.headers as Record<string, string>).forEach(([k, v]) => { headers[k] = v; });
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session has expired. Please log in again.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = (data as { detail?: string; message?: string }).detail ||
        (data as { detail?: string; message?: string }).message || msg;
    } catch { /* keep default */ }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function apiDownload(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function formatINR(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "Rs.0";
  return `Rs.${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("en-IN");
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ---------------- Phase 2: shared helpers ---------------- */

export interface UploadResult {
  url: string;
  filename: string;
  size_bytes?: number;
  content_type?: string;
}

/** Upload one file via POST /api/uploads (multipart field "file"). */
export async function uploadFile(file: File): Promise<UploadResult> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/uploads`, { method: "POST", headers, body: form });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) window.location.href = "/login";
    throw new ApiError(401, "Session has expired. Please log in again.");
  }
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      msg = (data as { detail?: string; message?: string }).detail || (data as { detail?: string; message?: string }).message || msg;
    } catch { /* keep default */ }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as UploadResult;
}

/** File URLs returned by the API may be relative ("/uploads/..."); make them absolute. */
export function resolveFileUrl(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE.replace(/\/api$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Normalise a list response that may be a bare array or {items, total}. */
export function asList<T>(data: Paged<T> | T[] | undefined | null): { items: T[]; total: number } {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data?.items || [], total: data?.total ?? (data?.items || []).length };
}

export type AnyRecord = Record<string, unknown>;
export const idOf = (r: AnyRecord): string => String(r.id ?? "");
export const strOf = (r: AnyRecord, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "—";
};

/* ---------------- Phase 2: entity types ---------------- */

export interface TestSeries { id: number | string; title: string; description?: string; category?: string; price?: number; validity_days?: number; [key: string]: unknown }
export interface TestQuestion { id: number | string; chapter_test?: string; question_text: string; option_a?: string; option_b?: string; option_c?: string; option_d?: string; correct_option?: string; marks?: number; negative_marks?: number; [key: string]: unknown }
export interface VideoAssignment { id: number | string; title: string; course_id?: number | string; video_url?: string; description?: string; due_date?: string; [key: string]: unknown }
export interface VideoSubmission { id: number | string; assignment_id?: number | string; student_id?: number | string; student_name?: string; marks?: number; feedback?: string; status?: string; [key: string]: unknown }
export interface TestAssignment { id: number | string; title: string; test_series_id?: number | string; student_id?: number | string; due_date?: string; [key: string]: unknown }
export interface StudentAssignment { id: number | string; test_assignment_id?: number | string; student_id?: number | string; score?: number; total_marks?: number; status?: string; [key: string]: unknown }
export interface ScoreRow { student_id: number | string; student_name?: string; score?: number; total_marks?: number; [key: string]: unknown }
export interface NoteItem { id: number | string; title: string; folder?: string; kind?: string; file_url?: string; description?: string; [key: string]: unknown }
export interface PreviousPaper { id: number | string; title: string; exam_type_id?: number | string; year?: number; file_url?: string; [key: string]: unknown }
export interface ExamType { id: number | string; name: string; [key: string]: unknown }
export interface Ebook { id: number | string; title: string; author_id?: number | string; ebook_type_id?: number | string; price?: number; file_url?: string; cover_url?: string; [key: string]: unknown }
export interface EbookType { id: number | string; name: string; [key: string]: unknown }
export interface Author { id: number | string; name: string; bio?: string; [key: string]: unknown }
export interface EbookBanner { id: number | string; title: string; image_url?: string; weight?: number; status?: string; [key: string]: unknown }
export interface Seminar { id: number | string; title: string; description?: string; category?: string; scheduled_at?: string; meeting_url?: string; [key: string]: unknown }
export interface Bundle { id: number | string; name: string; description?: string; price?: number; course_ids?: (number | string)[]; test_series_ids?: (number | string)[]; ebook_ids?: (number | string)[]; [key: string]: unknown }
export interface YoutubePlaylistItem { id: number | string; video_id: string; title?: string; category?: string; [key: string]: unknown }
export interface Lead { id: number | string; name: string; phone?: string; email?: string; source?: string; type?: string; status?: string; [key: string]: unknown }
export interface Testimonial { id: number | string; student_name: string; text?: string; rating?: number; [key: string]: unknown }
export interface Topper { id: number | string; student_id?: number | string; student_name?: string; exam?: string; rank?: number | string; score?: number; [key: string]: unknown }
export interface BannerItem { id: number | string; name: string; image_url?: string; banner_type?: string; redirection_type?: string; redirection_value?: string; placement?: string; weight?: number; status?: string; popup?: boolean; [key: string]: unknown }
export interface NotificationItem { id: number | string; title: string; body?: string; audience?: string; created_at?: string; [key: string]: unknown }
export interface CurrentAffair { id: number | string; title: string; language?: string; content?: string; published_date?: string; [key: string]: unknown }
export interface JobItem { id: number | string; title: string; thumbnail_url?: string; description?: string; [key: string]: unknown }
export interface Coupon { id: number | string; code: string; discount_percent?: number; max_discount?: number; valid_from?: string; valid_to?: string; is_active?: boolean; [key: string]: unknown }
export interface AppliedCoupon { id: number | string; code?: string; student_name?: string; order_id?: number | string; discount?: number; created_at?: string; [key: string]: unknown }
export interface OtpUsage { id: number | string; otp?: string; mobile?: string; created_at?: string; [key: string]: unknown }
export interface Enquiry { id: number | string; name: string; email?: string; phone?: string; message?: string; enquiry_type_id?: number | string; status?: string; [key: string]: unknown }
export interface EnquiryType { id: number | string; name: string; [key: string]: unknown }
export interface Integration { provider: string; name: string; status?: string; badge?: string; category?: string; description?: string; [key: string]: unknown }
export interface AppUser { id: number | string; username: string; email?: string; role?: string; [key: string]: unknown }
export interface CourseLog { id: number | string; course_id?: number | string; course_title?: string; action?: string; message?: string; created_at?: string; [key: string]: unknown }

/* ---------------- Courses: subjects, topics, videos, packages, copy ---------------- */

export interface Subject {
  id: number | string;
  course_id: number | string;
  name: string;
  description?: string;
  order?: number;
  [key: string]: unknown;
}

export interface Topic {
  id: number | string;
  subject_id: number | string;
  name: string;
  description?: string;
  order?: number;
  [key: string]: unknown;
}

export interface CourseVideo {
  id: number | string;
  course_id: number | string;
  subject_id?: number | string | null;
  topic_id?: number | string | null;
  title: string;
  video_url: string;
  duration_seconds?: number;
  order?: number;
  is_free_preview?: boolean;
  [key: string]: unknown;
}

export interface CoursePackage {
  id: number | string;
  name: string;
  description?: string;
  course_ids: (number | string)[];
  price?: number;
  mrp?: number;
  is_active?: boolean;
  [key: string]: unknown;
}

/** Format a duration in seconds as "mm:ss" (or "h:mm:ss" for long videos). */
export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || Number.isNaN(Number(seconds))) return "—";
  const s = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}

/* ---------------- Phase 2: typed resource helpers ---------------- */

function resource<T>(base: string) {
  return {
    list: (query = "") => apiFetch<Paged<T> | T[]>(`${base}${query}`),
    get: (id: number | string) => apiFetch<T>(`${base}/${id}`),
    create: (body: unknown) => apiFetch<T>(base, { method: "POST", body: JSON.stringify(body) }),
    update: (id: number | string, body: unknown) => apiFetch<T>(`${base}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: number | string) => apiFetch<void>(`${base}/${id}`, { method: "DELETE" }),
  };
}

export const testSeriesApi = resource<TestSeries>("/test-series");
export const coursesApi = resource<Course>("/courses");

export const subjectsApi = {
  list: (courseId: number | string) => apiFetch<Paged<Subject> | Subject[]>(`/courses/${courseId}/subjects`),
  get: (id: number | string) => apiFetch<Subject>(`/subjects/${id}`),
  create: (courseId: number | string, body: unknown) => apiFetch<Subject>(`/courses/${courseId}/subjects`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: number | string, body: unknown) => apiFetch<Subject>(`/subjects/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: number | string) => apiFetch<void>(`/subjects/${id}`, { method: "DELETE" }),
};

export const topicsApi = {
  list: (subjectId: number | string) => apiFetch<Paged<Topic> | Topic[]>(`/subjects/${subjectId}/topics`),
  get: (id: number | string) => apiFetch<Topic>(`/topics/${id}`),
  create: (subjectId: number | string, body: unknown) => apiFetch<Topic>(`/subjects/${subjectId}/topics`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: number | string, body: unknown) => apiFetch<Topic>(`/topics/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: number | string) => apiFetch<void>(`/topics/${id}`, { method: "DELETE" }),
};

export const courseVideosApi = {
  list: (courseId: number | string, subjectId?: string, topicId?: string) => {
    const q = new URLSearchParams();
    if (subjectId) q.set("subject_id", subjectId);
    if (topicId) q.set("topic_id", topicId);
    const qs = q.toString();
    return apiFetch<Paged<CourseVideo> | CourseVideo[]>(`/courses/${courseId}/videos${qs ? `?${qs}` : ""}`);
  },
  get: (id: number | string) => apiFetch<CourseVideo>(`/course-videos/${id}`),
  create: (courseId: number | string, body: unknown) => apiFetch<CourseVideo>(`/courses/${courseId}/videos`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: number | string, body: unknown) => apiFetch<CourseVideo>(`/course-videos/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: number | string) => apiFetch<void>(`/course-videos/${id}`, { method: "DELETE" }),
};

export const coursePackagesApi = resource<CoursePackage>("/course-packages");

export const copyCourseApi = {
  copy: (courseId: number | string, body: { new_name?: string; price?: number }) =>
    apiFetch<Course>(`/courses/${courseId}/copy`, { method: "POST", body: JSON.stringify(body) }),
};
export const videoAssignmentsApi = resource<VideoAssignment>("/video-assignments");
export const testAssignmentsApi = resource<TestAssignment>("/test-assignments");
export const studentAssignmentsApi = resource<StudentAssignment>("/test-assignments/student-assignments");
export const notesApi = resource<NoteItem>("/notes");
export const previousPapersApi = resource<PreviousPaper>("/previous-papers");
export const examTypesApi = resource<ExamType>("/exam-types");
export const ebooksApi = resource<Ebook>("/ebooks");
export const ebookTypesApi = resource<EbookType>("/ebook-types");
export const authorsApi = resource<Author>("/authors");
export const ebookBannersApi = resource<EbookBanner>("/ebook-banners");
export const seminarsApi = resource<Seminar>("/seminars");
export const bundlesApi = resource<Bundle>("/bundles");
export const youtubePlaylistsApi = resource<YoutubePlaylistItem>("/youtube-playlists");
export const leadsApi = resource<Lead>("/leads");
export const testimonialsApi = resource<Testimonial>("/testimonials");
export const toppersApi = resource<Topper>("/toppers");
export const bannersApi = resource<BannerItem>("/banners");
export const notificationsApi = resource<NotificationItem>("/notifications");
export const currentAffairsApi = resource<CurrentAffair>("/current-affairs");
export const jobsApi = resource<JobItem>("/jobs");
export const couponsApi = resource<Coupon>("/coupons");
export const enquiriesApi = resource<Enquiry>("/enquiries");
export const enquiryTypesApi = resource<EnquiryType>("/enquiry-types");
export const usersApi = resource<AppUser>("/users");

export const testSeriesQuestionsApi = {
  list: (seriesId: number | string) => apiFetch<Paged<TestQuestion> | TestQuestion[]>(`/test-series/${seriesId}/questions`),
  create: (seriesId: number | string, body: unknown) => apiFetch<TestQuestion>(`/test-series/${seriesId}/questions`, { method: "POST", body: JSON.stringify(body) }),
  remove: (seriesId: number | string, qid: number | string) => apiFetch<void>(`/test-series/${seriesId}/questions/${qid}`, { method: "DELETE" }),
};

export const videoSubmissionsApi = {
  list: (assignmentId?: string) => apiFetch<Paged<VideoSubmission> | VideoSubmission[]>(`/video-assignments/submissions${assignmentId ? `?assignment_id=${encodeURIComponent(assignmentId)}` : ""}`),
  create: (body: unknown) => apiFetch<VideoSubmission>("/video-assignments/submissions", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number | string, body: unknown) => apiFetch<VideoSubmission>(`/video-assignments/submissions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

export const scoreSheetApi = {
  get: (testSeriesId?: string, chapterTest?: string) => {
    const q = new URLSearchParams();
    if (testSeriesId) q.set("test_series_id", testSeriesId);
    if (chapterTest) q.set("chapter_test", chapterTest);
    return apiFetch<{ students: ScoreRow[] }>(`/score-sheet?${q.toString()}`);
  },
  save: (body: unknown) => apiFetch("/scores", { method: "POST", body: JSON.stringify(body) }),
};

export const otpUsageApi = {
  list: (mobile?: string) => apiFetch<Paged<OtpUsage> | OtpUsage[]>(`/otp-usage${mobile ? `?mobile=${encodeURIComponent(mobile)}` : ""}`),
};

export const ordersActionsApi = {
  transfer: (id: number | string, toStudentId: number | string) => apiFetch(`/orders/${id}/transfer`, { method: "POST", body: JSON.stringify({ to_student_id: toStudentId }) }),
  refund: (id: number | string, reason: string) => apiFetch(`/orders/${id}/refund`, { method: "POST", body: JSON.stringify({ reason }) }),
  deactivate: (id: number | string) => apiFetch(`/orders/${id}/deactivate`, { method: "POST", body: JSON.stringify({}) }),
  deactivated: () => apiFetch<Paged<Order> | Order[]>("/orders/deactivated"),
  company: () => apiFetch<Paged<Order> | Order[]>("/orders/company"),
};

export const integrationsApi = {
  list: () => apiFetch<Integration[] | { items: Integration[] }>("/integrations"),
  setup: (provider: string, body: unknown = {}) => apiFetch(`/integrations/${provider}/setup`, { method: "POST", body: JSON.stringify(body) }),
};

export const courseLogsApi = {
  list: () => apiFetch<Paged<CourseLog> | CourseLog[]>("/course-logs"),
};

export const appliedCouponsApi = {
  list: () => apiFetch<Paged<AppliedCoupon> | AppliedCoupon[]>("/coupons/applied"),
};

export const toppersCallListApi = {
  list: () => apiFetch<Paged<Topper> | Topper[]>("/toppers/call-list"),
};

/* ---------------- Phase 4: live integrations, payments, AI, live classes ---------------- */

export interface IntegrationStatus {
  cashfree?: { configured?: boolean; env?: string };
  groq?: { configured?: boolean };
  gemini?: { configured?: boolean };
  whatsapp?: { configured?: boolean };
  live?: { provider?: string; configured?: boolean };
  fcm?: { configured?: boolean };
  sms?: { provider?: string; configured?: boolean };
  [key: string]: unknown;
}

export interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  source: "admin_panel" | "env" | "none";
  masked: string;
  updated_at?: string | null;
}

export interface Doubt {
  id: number;
  student_id?: number;
  student_name?: string;
  subject: string;
  topic?: string | null;
  question: string;
  ai_answer?: string | null;
  ai_provider?: string | null;
  teacher_reply?: string | null;
  teacher_name?: string | null;
  status: "open" | "ai_answered" | "answered" | string;
  created_at?: string | null;
  answered_at?: string | null;
}

export const doubtsApi = {
  list: (status?: string) =>
    apiFetch<Paged<Doubt> | Doubt[]>(`/teacher/doubts${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  get: (id: number | string) => apiFetch<Doubt>(`/teacher/doubts/${id}`),
  reply: (id: number | string, reply: string) =>
    apiFetch<Doubt>(`/teacher/doubts/${id}/reply`, { method: "POST", body: JSON.stringify({ reply }) }),
};

export const apiKeysApi = {
  list: () => apiFetch<{ keys: ApiKeyStatus[] }>("/integrations/api-keys"),
  save: (provider: string, apiKey: string) =>
    apiFetch<ApiKeyStatus>(`/integrations/api-keys/${provider}`, {
      method: "PUT",
      body: JSON.stringify({ api_key: apiKey }),
    }),
  remove: (provider: string) =>
    apiFetch<ApiKeyStatus>(`/integrations/api-keys/${provider}`, { method: "DELETE" }),
  test: (provider: string) =>
    apiFetch<{ provider: string; ok: boolean; message: string }>(`/integrations/api-keys/${provider}/test`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
};

export interface PaymentOrder {
  order_id?: number | string;
  cashfree_order_id?: string;
  payment_session_id?: string;
  payment_link?: string;
  amount?: number; // paise (backend txn.amount)
  amount_rupees?: number;
  status?: string;
  payment_status?: string;
  [key: string]: unknown;
}

/** Draft question in the backend's normalised shape: {question, options[], correct_option, answer, marks}. */
export interface AiDraftQuestion {
  question?: string;
  question_text?: string;
  options?: string[];
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  answer?: string;
  marks?: number;
  negative_marks?: number;
  topic?: string;
  [key: string]: unknown;
}

export interface AiGeneration {
  generation_id?: number | string;
  id?: number | string;
  topic?: string;
  class_name?: string;
  difficulty?: string;
  count?: number;
  status?: string;
  created_at?: string;
  source_filename?: string;
  test_series_id?: number | string | null;
  questions?: AiDraftQuestion[];
  draft_json?: AiDraftQuestion[];
  [key: string]: unknown;
}

export interface LiveConfig {
  provider?: string;
  configured?: boolean;
  [key: string]: unknown;
}

/** Multipart POST with auth (for file uploads such as AI question generation). */
export async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) window.location.href = "/login";
    throw new ApiError(401, "Session has expired. Please log in again.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = (data as { detail?: string; message?: string }).detail ||
        (data as { detail?: string; message?: string }).message || msg;
    } catch { /* keep default */ }
    throw new ApiError(res.status, msg);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const integrationsStatusApi = {
  get: () => apiFetch<IntegrationStatus>("/integrations/status"),
};

export const paymentsApi = {
  createOrder: (body: { item_type: string; item_id?: number | string; amount: number }) =>
    apiFetch<PaymentOrder>("/payments/create-order", { method: "POST", body: JSON.stringify(body) }),
  get: (orderId: number | string) => apiFetch<PaymentOrder>(`/payments/${orderId}`),
  verifyReturn: (orderId: number | string) =>
    apiFetch<PaymentOrder>(`/payments/cashfree/return?order_id=${encodeURIComponent(String(orderId))}`),
};

export const aiGeneratorApi = {
  generate: (form: FormData) => apiFetchForm<AiGeneration>("/ai/generate-questions", form),
  save: (body: { generation_id: number; test_series_id: number; questions: AiDraftQuestion[] }) =>
    apiFetch("/ai/questions/save", { method: "POST", body: JSON.stringify(body) }),
  generations: () => apiFetch<Paged<AiGeneration> | AiGeneration[]>("/ai/generations"),
};

export const messagingApi = {
  whatsappSend: (body: { to: string; template: string; params?: string[] }) =>
    apiFetch<{ success?: boolean; message?: string; status?: string; [key: string]: unknown }>("/integrations/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pushSend: (body: { title: string; body: string; topic?: string }) =>
    apiFetch<{ success?: boolean; message?: string; status?: string; [key: string]: unknown }>("/integrations/push/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const liveConfigApi = {
  get: () => apiFetch<LiveConfig>("/live/config"),
};

