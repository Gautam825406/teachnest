// Typed API client for the fixed TeachNest student API contract.
// Base URL: EXPO_PUBLIC_API_URL, defaulting to the live backend.
// Local dev: EXPO_PUBLIC_API_URL=http://localhost:8000/api
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://teachnest-api.onrender.com/api';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data as { detail?: unknown; message?: unknown } | null)?.detail ??
      (data as { detail?: unknown; message?: unknown } | null)?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { body: JSON.stringify(body ?? {}), method: 'POST' });

// ---- Types (match the fixed contract) ----
export interface Student {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  course_ids?: number[];
}
export interface Banner { id: number; title?: string; name?: string; image_url?: string | null; link?: string | null }
export interface Course {
  id: number; title: string; description?: string | null; mrp?: number | null;
  price?: number | null; validity_days?: number | null; category?: string | number | null;
  category_id?: number | null;
  thumbnail_url?: string | null; syllabus_url?: string | null;
  teacher_ids?: number[]; show_in_app?: boolean; drip_content?: boolean; sequential_learning?: boolean;
}
export interface TestQuestion { id: number; question: string; options: string[]; marks?: number }
export interface TestSeries {
  id: number; title: string; description?: string | null;
  questions?: TestQuestion[]; total_marks?: number | null;
}
export interface HomeData {
  banners?: Banner[]; featured_courses?: Course[]; test_series?: TestSeries[];
  current_affairs?: Array<{ id: number; title: string; description?: string | null }>;
  jobs?: Array<{ id: number; title: string; description?: string | null }>;
  toppers?: Array<{ id: number; name: string; score?: string | number | null }>;
  testimonials?: Array<{ id: number; name?: string; text?: string; message?: string }>;
}
export interface Paged<T> { items: T[]; total: number }
export interface ContentItem { id: number; title: string; description?: string | null; url?: string | null; file_url?: string | null; video_url?: string | null; subject?: string | null }
// ---- Course content (read-only student view) ----
// Matches GET /api/student/courses/{course_id}/content:
// { course, subjects: [{ id, name, description, order, topics: [{ id, name, description, order, videos: [...] }] }], videos: [...] }
// `videos` at the top level are course-level videos with no topic.
export interface CourseContentVideo {
  id: number; title: string; video_url?: string | null;
  duration_seconds?: number | null; order?: number | null; is_free_preview?: boolean;
}
export interface CourseContentTopic {
  id: number; name: string; description?: string | null; order?: number | null;
  videos: CourseContentVideo[];
}
export interface CourseContentSubject {
  id: number; name: string; description?: string | null; order?: number | null;
  topics: CourseContentTopic[];
}
export interface CourseContent {
  course: Course;
  subjects: CourseContentSubject[];
  videos: CourseContentVideo[];
}
export interface Score { id: number; test_series_id?: number; test_series_title?: string; chapter_test?: string; title?: string; score?: number; total_marks?: number; correct?: number; total_questions?: number; created_at?: string }
export interface Assignment {
  id: number; title: string; description?: string | null; type?: string;
  due_date?: string | null; status?: string | null; score?: number | null;
}
export interface Seminar { id: number; title: string; description?: string | null; scheduled_at?: string | null; join_url?: string | null; status?: string | null }
export interface NotificationItem { id: number; title: string; message?: string | null; body?: string | null; created_at?: string | null }
export interface Teacher { id: number; name: string; subject?: string | null; bio?: string | null }
export interface Bundle { id: number; title?: string; name?: string; description?: string | null; price?: number | null; mrp?: number | null }
export interface Order { id: number; transaction_id?: string | null; amount?: number; status?: string; created_at?: string | null; items?: unknown }

// ---- Phase 4: Cashfree payments (no demo purchase path) ----
export type PaymentItemType = 'course' | 'bundle';
export interface PaymentOrder {
  order_id: string | number;
  cashfree_order_id?: string | null;
  payment_session_id?: string | null;
  payment_link?: string | null;
  /** Amount in paise (backend stores paise) — do NOT display directly. */
  amount?: number | null;
  /** Amount in rupees — display this. */
  amount_rupees?: number | null;
  status?: string | null;
}
export interface PaymentVerification {
  status: 'PAID' | 'PENDING' | 'FAILED' | string;
  order_id?: string | number | null;
  amount?: number | null;
}
export interface PaymentRecord {
  order_id?: string | number | null;
  cashfree_order_id?: string | null;
  payment_session_id?: string | null;
  payment_link?: string | null;
  /** Amount in paise (backend stores paise) — do NOT display directly. */
  amount?: number | null;
  /** Amount in rupees — display this. */
  amount_rupees?: number | null;
  status?: string | null;
  item_type?: string | null;
  item_id?: number | string | null;
  created_at?: string | null;
}
export interface LiveConfig {
  provider?: string | null;
  configured: boolean;
}
export interface OtpResponse {
  demo_otp?: string | null;
  /** True when the institute has not configured SMS and the OTP is a demo one. */
  demo?: boolean;
  message: string;
}

// ---- Endpoints ----
export const api = {
  requestOtp: (org_code: string, phone: string) =>
    post<OtpResponse>('/student/auth/request-otp', { org_code, phone }),
  verifyOtp: (org_code: string, phone: string, otp: string, name?: string) =>
    post<{ access_token: string; token_type: string; student: Student }>('/student/auth/verify', { org_code, phone, otp, name }),
  me: () => get<Student>('/student/me'),
  home: () => get<HomeData>('/student/home'),
  courses: (page = 1, per_page = 20) => get<Paged<Course>>(`/student/courses?page=${page}&per_page=${per_page}`),
  course: (id: number | string) => get<Course>(`/student/courses/${id}`),
  getCourseContent: (id: number | string) => get<CourseContent>(`/student/courses/${id}/content`),
  // Phase 4 Cashfree purchase — replaces the Phase 3 demo purchase entirely.
  // There is no demo/success path: if Cashfree is not configured the backend
  // returns 503 and the caller must say so honestly (see course detail).
  createPaymentOrder: (item_type: PaymentItemType, item_id: number | string) =>
    post<PaymentOrder>('/student/payments/create-order', { item_type, item_id }),
  verifyPayment: (order_id: number | string) =>
    post<PaymentVerification>('/student/payments/verify', { order_id }),
  getPayment: (order_id: number | string) =>
    get<PaymentRecord>(`/student/payments/${order_id}`),
  liveConfig: () => get<LiveConfig>('/student/live/config'),
  myCourses: () => get<Paged<Course> | Course[]>('/student/my-courses'),
  myOrders: () => get<Paged<Order> | Order[]>('/student/my-orders'),
  videos: () => get<Paged<ContentItem>>('/student/videos'),
  notes: () => get<Paged<ContentItem>>('/student/notes'),
  previousPapers: () => get<Paged<ContentItem>>('/student/previous-papers'),
  ebooks: () => get<Paged<ContentItem>>('/student/ebooks'),
  syllabus: () => get<Paged<ContentItem>>('/student/syllabus'),
  testSeries: () => get<Paged<TestSeries> | TestSeries[]>('/student/test-series'),
  testDetail: (id: number | string) => get<TestSeries>(`/student/test-series/${id}`),
  attemptTest: (id: number | string, answers: Record<string, number>) =>
    post<{ score: number; total_marks: number; correct: number; total_questions: number }>(`/student/test-series/${id}/attempt`, { answers }),
  scores: () => get<Paged<Score> | Score[]>('/student/scores'),
  assignments: () =>
    get<{ video_assignments: Assignment[]; test_assignments: Assignment[] }>('/student/assignments'),
  submitVideoAssignment: (aid: number | string, body: { text?: string; file_name?: string }) =>
    post(`/student/assignments/video/${aid}/submit`, body),
  submitTestAssignment: (aid: number | string) => post(`/student/assignments/test/${aid}/submit`),
  seminars: () => get<Paged<Seminar> | Seminar[]>('/student/seminars'),
  notifications: () => get<Paged<NotificationItem> | NotificationItem[]>('/student/notifications'),
  teachers: () => get<Paged<Teacher> | Teacher[]>('/student/teachers'),
  bundles: () => get<Paged<Bundle> | Bundle[]>('/student/bundles'),
  enquiry: (message: string, enquiry_type_id?: number) =>
    post('/student/enquiries', { message, enquiry_type_id }),
};

export function toArray<T>(v: Paged<T> | T[] | undefined | null): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.items ?? [];
}
export function inr(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}
export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '';
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
