"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, uploadFile, type Category, type Course, type Subcategory, type Teacher } from "@/lib/api";
import { Button, ErrorBox, Field, Input, Label, Select, Textarea } from "@/components/ui";

export const VIDEO_ORDERS = [
  "Default Sorting",
  "Alphabetical A-Z",
  "Alphabetical Z-A",
  "Class Time Oldest to Newest",
  "Alphabetical & Numeric Ascending",
  "Alphabetical & Numeric Descending",
];

export interface CourseFormValues {
  title: string; mrp: string; price: string; validity_days: string; description: string;
  category_id: string; subcategory_id: string; test_series_ids: string[];
  position: string; video_order: string; thumbnail_url: string; syllabus_url: string;
  telegram_paid: string; telegram_free: string; whatsapp: string;
  show_in_app: boolean; drip_content: boolean; sequential_learning: boolean; block_payment: boolean;
  max_validity: string; teacher_ids: string[];
}

export function courseToValues(c: Course): CourseFormValues {
  return {
    title: c.title || "", mrp: String(c.mrp ?? ""), price: String(c.price ?? ""),
    validity_days: String(c.validity_days ?? ""), description: c.description || "",
    category_id: c.category_id != null ? String(c.category_id) : "",
    subcategory_id: c.subcategory_id != null ? String(c.subcategory_id) : "",
    test_series_ids: (c.test_series_ids || []).map(String),
    position: String(c.position ?? ""), video_order: c.video_order || "Default Sorting",
    thumbnail_url: c.thumbnail_url || "", syllabus_url: c.syllabus_url || "",
    telegram_paid: c.telegram_paid || "", telegram_free: c.telegram_free || "", whatsapp: c.whatsapp || "",
    show_in_app: c.show_in_app !== false, drip_content: !!c.drip_content,
    sequential_learning: !!c.sequential_learning, block_payment: !!c.block_payment,
    max_validity: c.max_validity ? String(c.max_validity).slice(0, 10) : "",
    teacher_ids: (c.teacher_ids || []).map(String),
  };
}

export const emptyCourseValues: CourseFormValues = {
  title: "", mrp: "", price: "", validity_days: "", description: "",
  category_id: "", subcategory_id: "", test_series_ids: [],
  position: "", video_order: "Default Sorting", thumbnail_url: "", syllabus_url: "",
  telegram_paid: "", telegram_free: "", whatsapp: "",
  show_in_app: true, drip_content: false, sequential_learning: false, block_payment: false,
  max_validity: "", teacher_ids: [],
};

export default function CourseForm({ initial, courseId }: { initial: CourseFormValues; courseId?: string | number }) {
  const router = useRouter();
  const [v, setV] = useState<CourseFormValues>(initial);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof CourseFormValues>(k: K, val: CourseFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    apiFetch<Category[]>("/course-categories").then(setCategories).catch(() => undefined);
    apiFetch<Subcategory[]>("/course-subcategories").then(setSubcategories).catch(() => undefined);
    apiFetch<{ items: Teacher[]; total: number }>("/teachers?per_page=100").then((d) => setTeachers(d.items || [])).catch(() => undefined);
  }, []);

  const filteredSubs = subcategories.filter((s) => !v.category_id || String(s.category_id) === v.category_id);
  const mrp = Number(v.mrp) || 0;
  const price = Number(v.price) || 0;
  const discount = mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

  function wrapDesc(prefix: string, suffix: string) {
    const el = descRef.current;
    if (!el) return;
    const start = el.selectionStart ?? v.description.length;
    const end = el.selectionEnd ?? v.description.length;
    const selected = v.description.slice(start, end) || "text";
    const next = v.description.slice(0, start) + prefix + selected + suffix + v.description.slice(end);
    set("description", next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length); });
  }

  async function handleUpload(key: "thumbnail_url" | "syllabus_url", file: File) {
    setUploading(key);
    setError(null);
    try {
      const up = await uploadFile(file);
      set(key, up.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }

  async function createCategory() {
    if (!newCategory.trim()) return;
    try {
      const c = await apiFetch<Category>("/course-categories", { method: "POST", body: JSON.stringify({ name: newCategory.trim() }) });
      setCategories((p) => [...p, c]);
      set("category_id", String(c.id));
      setNewCategory("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create category."); }
  }

  async function createSubcategory() {
    if (!newSubcategory.trim() || !v.category_id) { setError("Select a category first, then create a subcategory."); return; }
    try {
      const s = await apiFetch<Subcategory>("/course-subcategories", { method: "POST", body: JSON.stringify({ name: newSubcategory.trim(), category_id: Number(v.category_id) || v.category_id }) });
      setSubcategories((p) => [...p, s]);
      set("subcategory_id", String(s.id));
      setNewSubcategory("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create subcategory."); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = {
      title: v.title, mrp: Number(v.mrp), price: Number(v.price), validity_days: Number(v.validity_days),
      description: v.description,
      category_id: v.category_id ? (Number(v.category_id) || v.category_id) : null,
      subcategory_id: v.subcategory_id ? (Number(v.subcategory_id) || v.subcategory_id) : null,
      test_series_ids: v.test_series_ids.map((x) => Number(x) || x),
      position: v.position ? Number(v.position) : 0,
      video_order: v.video_order,
      thumbnail_url: v.thumbnail_url || undefined,
      syllabus_url: v.syllabus_url || undefined,
      telegram_paid: v.telegram_paid || undefined, telegram_free: v.telegram_free || undefined,
      whatsapp: v.whatsapp || undefined,
      show_in_app: v.show_in_app, drip_content: v.drip_content,
      sequential_learning: v.sequential_learning, block_payment: v.block_payment,
      max_validity: v.max_validity || null,
      teacher_ids: v.teacher_ids.map((x) => Number(x) || x),
    };
    try {
      if (courseId) await apiFetch(`/courses/${courseId}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiFetch("/courses", { method: "POST", body: JSON.stringify(payload) });
      router.push("/dashboard/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the course.");
    } finally { setBusy(false); }
  }

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* 1. Basic Course Info */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold tracking-tight">1. Basic Course Info</h2>
          <p className="mb-4 text-xs text-stone-500">Kindly verify all details before submitting.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Course Title" required><Input value={v.title} onChange={(e) => set("title", e.target.value)} required placeholder="e.g. Mathematics Class 12" /></Field></div>
            <Field label="M.R.P in rupees" required><Input type="number" min={0} value={v.mrp} onChange={(e) => set("mrp", e.target.value)} required placeholder="e.g. 1999" /></Field>
            <Field label="Price in rupees" required><Input type="number" min={0} value={v.price} onChange={(e) => set("price", e.target.value)} required placeholder="e.g. 999" /></Field>
            <Field label="Validity in Days" required><Input type="number" min={1} value={v.validity_days} onChange={(e) => set("validity_days", e.target.value)} required placeholder="e.g. 365" /></Field>
            <div className="sm:col-span-2">
              <Label required={false}>Course Description</Label>
              <div className="mb-1 flex gap-1">
                <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => wrapDesc("**", "**")}><b>B</b></Button>
                <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => wrapDesc("*", "*")}><i>I</i></Button>
                <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => wrapDesc("[", "](https://)")}>Link</Button>
              </div>
              <Textarea ref={descRef} rows={6} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe what students will learn in this course..." />
            </div>
          </div>
        </section>

        {/* 2. Meta Details */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold tracking-tight">2. Course Meta Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Field label="Course Category">
                <Select value={v.category_id} onChange={(e) => { set("category_id", e.target.value); set("subcategory_id", ""); }}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
                </Select>
              </Field>
              <div className="mt-2 flex gap-2">
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                <Button type="button" variant="secondary" onClick={createCategory}>Create New</Button>
              </div>
            </div>
            <div>
              <Field label="Course Subcategory">
                <Select value={v.subcategory_id} onChange={(e) => set("subcategory_id", e.target.value)}>
                  <option value="">Select Subcategory</option>
                  {filteredSubs.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
                </Select>
              </Field>
              <div className="mt-2 flex gap-2">
                <Input value={newSubcategory} onChange={(e) => setNewSubcategory(e.target.value)} placeholder="New subcategory name" />
                <Button type="button" variant="secondary" onClick={createSubcategory}>Create New</Button>
              </div>
            </div>
            <Field label="Test Series">
              <div className="max-h-32 overflow-y-auto rounded-lg border border-stone-300 p-2 text-sm dark:border-stone-700">
                <p className="text-xs text-stone-500">Select test series to include in this course.</p>
                <Input className="mt-2" value={v.test_series_ids.join(",")} onChange={(e) => set("test_series_ids", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="Comma-separated test series IDs" />
              </div>
            </Field>
            <Field label="Position"><Input type="number" value={v.position} onChange={(e) => set("position", e.target.value)} placeholder="0" /></Field>
            <Field label="Video Order">
              <Select value={v.video_order} onChange={(e) => set("video_order", e.target.value)}>
                {VIDEO_ORDERS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Thumbnail" hint="JPEG, JPG or PNG. Recommended 1280 x 720.">
              <Input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload("thumbnail_url", f); }} />
              {uploading === "thumbnail_url" && <p className="mt-1 text-xs text-stone-500">Uploading...</p>}
              {v.thumbnail_url && <p className="mt-1 break-all text-xs text-stone-500">Uploaded: {v.thumbnail_url}</p>}
            </Field>
            <Field label="Syllabus PDF" hint="Upload the course syllabus as a PDF.">
              <Input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload("syllabus_url", f); }} />
              {uploading === "syllabus_url" && <p className="mt-1 text-xs text-stone-500">Uploading...</p>}
              {v.syllabus_url && <p className="mt-1 break-all text-xs text-stone-500">Uploaded: {v.syllabus_url}</p>}
            </Field>
          </div>
        </section>

        {/* 3. Social Details */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold tracking-tight">3. Course Social Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Paid Telegram"><Input value={v.telegram_paid} onChange={(e) => set("telegram_paid", e.target.value)} placeholder="Paid Telegram link" /></Field>
            <Field label="Free Telegram"><Input value={v.telegram_free} onChange={(e) => set("telegram_free", e.target.value)} placeholder="Free Telegram link" /></Field>
            <Field label="WhatsApp"><Input value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="WhatsApp number or link" /></Field>
          </div>
        </section>

        {/* 4. Advance Details */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold tracking-tight">4. Course Advance Details</h2>
          <div className="mt-4 space-y-3">
            {([
              ["show_in_app", "Show in App & Website"],
              ["drip_content", "Drip Content"],
              ["sequential_learning", "Sequential Learning"],
              ["block_payment", "Block Payment"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={v[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 accent-brand-700" /> {label}
              </label>
            ))}
            <Field label="Max Course Validity"><Input type="date" value={v.max_validity} onChange={(e) => set("max_validity", e.target.value)} /></Field>
          </div>
        </section>

        {/* 5. Teachers */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold tracking-tight">5. Course Teachers</h2>
          <div className="mt-4 space-y-2">
            {teachers.length === 0 && <p className="text-sm text-stone-500">No teachers yet. Add teachers from the Teachers page first.</p>}
            {teachers.map((t) => (
              <label key={String(t.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={v.teacher_ids.includes(String(t.id))}
                  onChange={() => set("teacher_ids", toggle(v.teacher_ids, String(t.id)))}
                  className="h-4 w-4 accent-brand-700"
                />
                {t.name} {t.subject ? `— ${t.subject}` : ""}
              </label>
            ))}
          </div>
        </section>

        <ErrorBox message={error} />
        <Button type="submit" className="w-full sm:w-auto" disabled={busy || uploading !== null}>{busy ? "Saving..." : "Save Details"}</Button>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow dark:border-stone-800 dark:bg-stone-900">
          <div className="flex h-40 items-center justify-center bg-brand-700 text-sm font-medium text-white">
            {v.thumbnail_url ? v.thumbnail_url : "Course Thumbnail"}
          </div>
          <div className="p-4">
            <p className="text-sm text-stone-500">Live Preview</p>
            <h3 className="mt-1 font-bold">{v.title || "Course Title"}</h3>
            <p className="mt-1 text-sm text-stone-500">Validity: {v.validity_days ? `${v.validity_days} Days` : "– Days"}</p>
            <p className="mt-2">
              <span className="text-lg font-bold">Rs.{price || 0}</span>{" "}
              {mrp > price && <span className="text-sm text-stone-400 line-through">Rs.{mrp}</span>}
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-600">Discount of {discount}%</p>
            <Button type="button" className="mt-3 w-full" variant="secondary">Buy Now</Button>
          </div>
        </div>
      </aside>
    </form>
  );
}
