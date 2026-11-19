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
