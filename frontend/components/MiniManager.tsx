"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, uploadFile, type AnyRecord } from "@/lib/api";
import { Button, Card, ErrorBox, Field, Input, Select, Textarea } from "@/components/ui";
import type { CrudField } from "@/components/CrudPage";

/**
 * Compact list + inline add form for small sub-resources (exam types,
 * e-book types, authors, e-book banners). No fake data — empty state
 * when the API returns nothing.
 */
export default function MiniManager({
  title, endpoint, itemLabel, fields, displayKeys,
}: {
  title: string;
  endpoint: string;
  itemLabel: string;
  fields: CrudField[];
  displayKeys: string[];
}) {
  const [items, setItems] = useState<AnyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AnyRecord>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<unknown>(`${endpoint}?per_page=100`);
      const { items: list } = asList(data as never);
      setItems(list as AnyRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not load ${itemLabel.toLowerCase()}s.`);
    } finally { setLoading(false); }
  }, [endpoint, itemLabel]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function handleFile(f: CrudField, file: File) {
    setUploading(f.key);
    try {
      const up = await uploadFile(file);
      set(f.key, up.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally { setUploading(null); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: AnyRecord = {};
    fields.forEach((f) => {
      const v = form[f.key];
      if (f.type === "number") payload[f.key] = v === "" || v === undefined ? undefined : Number(v);
      else if (f.type === "checkbox") payload[f.key] = !!v;
      else payload[f.key] = v === "" ? undefined : v;
    });
    try {
      await apiFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setForm({});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not save the ${itemLabel.toLowerCase()}.`);
    } finally { setBusy(false); }
  }

  async function remove(row: AnyRecord) {
    if (!confirm(`Delete ${String(row.name || row.title || row.id)}? This cannot be undone.`)) return;
    setDeleting(String(row.id));
    try {
      await apiFetch(`${endpoint}/${row.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not delete the ${itemLabel.toLowerCase()}.`);
    } finally { setDeleting(null); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={load}>Refresh</Button>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No {itemLabel.toLowerCase()}s yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
          {items.map((row) => (
            <li key={String(row.id)} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {displayKeys.map((k) => String(row[k] ?? "")).filter(Boolean).join(" • ") || String(row.id)}
              </span>
              <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => remove(row)} disabled={deleting === String(row.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Field label={f.label} required={f.required}>
                {f.type === "textarea" ? (
                  <Textarea rows={2} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} required={f.required} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <Select value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                    <option value="">Select {f.label}</option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                ) : f.type === "file" ? (
                  <div>
                    <Input type="file" accept={f.accept} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(f, file); }} />
                    {uploading === f.key && <p className="mt-1 text-xs text-slate-500">Uploading...</p>}
                    {!!form[f.key] && <p className="mt-1 break-all text-xs text-slate-500">Uploaded: {String(form[f.key])}</p>}
                  </div>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => set(f.key, e.target.value)}
                    required={f.required}
                    placeholder={f.placeholder}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
        <Button type="submit" disabled={busy || uploading !== null}>{busy ? "Saving..." : `Add ${itemLabel}`}</Button>
      </form>
    </Card>
  );
}
