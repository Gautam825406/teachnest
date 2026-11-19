"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, uploadFile, type Category, type Teacher } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Textarea } from "@/components/ui";

interface TeacherForm {
  name: string; subject: string; email: string; phone: string;
  experience_years: string; display_weight: string; tagline: string;
  quote: string; categories: string[]; biography: string; photo_url: string;
}
const emptyForm: TeacherForm = {
  name: "", subject: "", email: "", phone: "", experience_years: "0", display_weight: "0",
  tagline: "", quote: "", categories: [], biography: "", photo_url: "",
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePhoto(file: File) {
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const up = await uploadFile(file);
      set("photo_url", up.url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Photo upload failed. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: Teacher[]; total: number } | Teacher[]>("/teachers?per_page=100");
      setTeachers(Array.isArray(data) ? data : data.items || []);
      const cats = await apiFetch<Category[]>("/course-categories").catch(() => [] as Category[]);
      setCategories(cats);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load teachers."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof TeacherForm>(k: K, v: TeacherForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  function openCreate() {
    setEditing(null); setForm(emptyForm); setFormError(null); setModalOpen(true);
  }
  function openEdit(t: Teacher) {
    setEditing(t);
    const cats = Array.isArray(t.categories) ? t.categories.map(String) : t.categories ? [String(t.categories)] : [];
    setForm({
      name: t.name || "", subject: t.subject || "", email: t.email || "", phone: t.phone || "",
      experience_years: String(t.experience_years ?? 0), display_weight: String(t.display_weight ?? 0),
      tagline: t.tagline || "", quote: t.quote || "", categories: cats,
      biography: t.biography || "", photo_url: t.photo_url || "",
    });
    setFormError(null); setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phone.trim())) { setFormError("Phone Number must be exactly 10 digits."); return; }
    setBusy(true); setFormError(null);
    const payload = {
      name: form.name, subject: form.subject, email: form.email, phone: form.phone,
      experience_years: Number(form.experience_years), display_weight: Number(form.display_weight),
      tagline: form.tagline, quote: form.quote || undefined,
      categories: form.categories.map((x) => Number(x) || x),
      biography: form.biography || undefined, photo_url: form.photo_url || undefined,
    };
    try {
      if (editing) await apiFetch(`/teachers/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiFetch("/teachers", { method: "POST", body: JSON.stringify(payload) });
      setModalOpen(false); load();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not save the teacher."); }
    finally { setBusy(false); }
  }

  async function remove(t: Teacher) {
    if (!confirm(`Delete teacher ${t.name}?`)) return;
    try { await apiFetch(`/teachers/${t.id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete the teacher."); }
  }

  return (
    <div>
      <BannerHeader
        title="Faculty & Instructor Profiles"
        subtitle="Manage your teachers and instructors."
        actions={<><Button variant="secondary" onClick={load}>Refresh</Button><Button onClick={openCreate}>+ Create New Teacher</Button></>}
      />
      <ErrorBox message={error} />
      {loading ? <Loading /> : teachers.length === 0 ? (
        <EmptyState title="No teachers yet" subtitle="Create your first teacher profile." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t) => (
            <Card key={String(t.id)} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {t.photo_url ? "📷" : t.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.subject || "—"}</p>
                  {t.is_active !== false && <Badge tone="green" >Active Instructor</Badge>}
                </div>
              </div>
              {t.tagline && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t.tagline}</p>}
              <p className="mt-2 text-xs text-slate-500">{t.email || ""} {t.phone ? `• ${t.phone}` : ""}</p>
              <p className="text-xs text-slate-500">Experience: {t.experience_years ?? 0} years • Weight: {t.display_weight ?? 0}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(t)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Teacher Profile" : "Create New Teacher Profile"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teacher Name" required><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
            <Field label="Subject Specialization" required><Input value={form.subject} onChange={(e) => set("subject", e.target.value)} required /></Field>
            <Field label="Email Address" required><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></Field>
            <Field label="Phone Number" required hint="Exactly 10 digits."><Input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} required inputMode="numeric" /></Field>
            <Field label="Experience (in Years)" required><Input type="number" min={0} value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} required /></Field>
            <Field label="Display Weight (Sort Order)" required hint="Higher appears first."><Input type="number" value={form.display_weight} onChange={(e) => set("display_weight", e.target.value)} required /></Field>
            <div className="sm:col-span-2"><Field label="Short Tagline / Intro" required><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} required /></Field></div>
            <div className="sm:col-span-2"><Field label="Inspirational Quote"><Input value={form.quote} onChange={(e) => set("quote", e.target.value)} /></Field></div>
            <div className="sm:col-span-2">
              <Field label="Associated Course Categories">
                <div className="space-y-1 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
                  {categories.length === 0 && <p className="text-sm text-slate-500">No categories yet.</p>}
                  {categories.map((c) => (
                    <label key={String(c.id)} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.categories.includes(String(c.id))} onChange={() => set("categories", form.categories.includes(String(c.id)) ? form.categories.filter((x) => x !== String(c.id)) : [...form.categories, String(c.id)])} className="h-4 w-4 accent-indigo-600" />
                      {c.name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2"><Field label="Detailed Biography / Description"><Textarea rows={4} value={form.biography} onChange={(e) => set("biography", e.target.value)} /></Field></div>
            <div className="sm:col-span-2">
              <Field label="Profile Photo" hint="JPG, PNG or WEBP, max 2 MB. Square avatar recommended.">
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePhoto(f); }} />
                {uploadingPhoto && <p className="mt-1 text-xs text-slate-500">Uploading...</p>}
                {form.photo_url && <p className="mt-1 break-all text-xs text-slate-500">Uploaded: {form.photo_url}</p>}
              </Field>
            </div>
          </div>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || uploadingPhoto}>{busy ? "Saving..." : editing ? "Update Teacher" : "Create Teacher"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
