"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, asList, formatDate, formatINR, resolveFileUrl, uploadFile, type AnyRecord } from "@/lib/api";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea } from "@/components/ui";

export type FieldType = "text" | "number" | "textarea" | "select" | "date" | "datetime" | "checkbox" | "file" | "multi" | "url" | "email" | "tel";

export interface CrudOption { value: string; label: string }

export interface CrudField {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: CrudOption[];
  /** Load select options from this endpoint (label taken from optionsLabelKey, default "name"). */
  optionsEndpoint?: string;
  optionsLabelKey?: string;
  /** For "multi": checkbox list loaded from this endpoint. */
  multiEndpoint?: string;
  multiLabelKey?: string;
  /** File input accept attribute, e.g. "application/pdf". */
  accept?: string;
}

export interface CrudColumn {
  key: string;
  label: string;
  format?: "date" | "inr" | "badge" | "link" | "bool";
}

export interface CrudPageProps {
  title: string;
  subtitle?: string;
  endpoint: string;
  itemLabel: string;
  fields: CrudField[];
  columns: CrudColumn[];
  searchPlaceholder?: string;
  /** Extra fixed query params, e.g. { type: "custom" }. */
  extraQuery?: Record<string, string>;
  createLabel?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  /** Link to a detail page for a row, e.g. (row) => `/dashboard/test-series/${row.id}` */
  detailHref?: (row: AnyRecord) => string;
  detailLabel?: string;
  /** Transform form values before POST/PUT. */
  beforeSave?: (values: AnyRecord) => AnyRecord;
  /** Extra action buttons rendered in the page header. */
  headerActions?: React.ReactNode;
}

function cellValue(row: AnyRecord, key: string): unknown {
  if (key.includes(".")) {
    return key.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as AnyRecord)[k] : undefined), row);
  }
  return row[key];
}

function displayValue(row: AnyRecord, col: CrudColumn): React.ReactNode {
  const v = cellValue(row, col.key);
  if (v === undefined || v === null || v === "") return "—";
  if (col.format === "date") return formatDate(String(v));
  if (col.format === "inr") return formatINR(Number(v));
  if (col.format === "bool") return <Badge tone={v ? "green" : "slate"}>{v ? "Yes" : "No"}</Badge>;
  if (col.format === "badge") {
    const s = String(v).toUpperCase();
    return <Badge tone={s === "ACTIVE" || s === "SUCCESS" || s === "COMPLETED" || s === "APPROVED" ? "green" : s === "PENDING" || s === "INACTIVE" ? "amber" : s === "FAILED" || s === "REJECTED" || s === "EXPIRED" ? "red" : "slate"}>{String(v)}</Badge>;
  }
  if (col.format === "link") {
    const url = resolveFileUrl(String(v));
    return <a href={url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-300">Open file</a>;
  }
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function CrudPage(props: CrudPageProps) {
  const {
    title, subtitle, endpoint, itemLabel, fields, columns, searchPlaceholder,
    extraQuery, createLabel, emptyTitle, emptySubtitle,
    allowCreate = true, allowEdit = true, allowDelete = true,
    detailHref, detailLabel = "View", beforeSave, headerActions,
  } = props;

  const [items, setItems] = useState<AnyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [form, setForm] = useState<AnyRecord>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, CrudOption[]>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const queryString = useCallback(() => {
    const q = new URLSearchParams({ per_page: "100" });
    if (search) q.set("search", search);
    if (extraQuery) Object.entries(extraQuery).forEach(([k, v]) => q.set(k, v));
    return q.toString();
  }, [search, extraQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<unknown>(`${endpoint}?${queryString()}`);
      const { items: list, total: t } = asList(data as never);
      setItems(list as AnyRecord[]);
      setTotal(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not load ${itemLabel.toLowerCase()}s.`);
    } finally { setLoading(false); }
  }, [endpoint, queryString, itemLabel]);

  useEffect(() => { load(); }, [load]);

  // Load dynamic select / multi options once.
  useEffect(() => {
    const jobs: Promise<void>[] = [];
    fields.forEach((f) => {
      const ep = f.optionsEndpoint || f.multiEndpoint;
      if (!ep) return;
      jobs.push(
        apiFetch<unknown>(ep)
          .then((data) => {
            const { items } = asList(data as never);
            const labelKey = f.optionsLabelKey || f.multiLabelKey || "name";
            const opts: CrudOption[] = (items as AnyRecord[]).map((r) => ({
              value: String(r.id ?? ""),
              label: String(r[labelKey] ?? r.title ?? r.name ?? r.id ?? ""),
            }));
            setDynamicOptions((p) => ({ ...p, [f.key]: opts }));
          })
          .catch(() => undefined)
      );
    });
    Promise.all(jobs).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const optionsFor = (f: CrudField): CrudOption[] => f.options || dynamicOptions[f.key] || [];

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  function emptyValues(): AnyRecord {
    const v: AnyRecord = {};
    fields.forEach((f) => {
      v[f.key] = f.type === "checkbox" ? false : f.type === "multi" ? [] : "";
    });
    return v;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyValues());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: AnyRecord) {
    setEditing(row);
    const v: AnyRecord = {};
    fields.forEach((f) => {
      const raw = row[f.key];
      if (f.type === "multi") v[f.key] = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
      else if (f.type === "checkbox") v[f.key] = !!raw;
      else if (f.type === "date" && raw) v[f.key] = String(raw).slice(0, 10);
      else if (f.type === "datetime" && raw) v[f.key] = String(raw).slice(0, 16);
      else v[f.key] = raw ?? "";
    });
    setForm(v);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleFile(f: CrudField, file: File) {
    setUploading(f.key);
    setFormError(null);
    try {
      const up = await uploadFile(file);
      set(f.key, up.url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const payload: AnyRecord = {};
    fields.forEach((f) => {
      const v = form[f.key];
      if (f.type === "number") payload[f.key] = v === "" || v === undefined ? undefined : Number(v);
      else if (f.type === "multi") payload[f.key] = Array.isArray(v) ? v.map((x) => (Number(x) || x)) : [];
      else if (f.type === "select" && f.optionsEndpoint) payload[f.key] = v === "" ? undefined : (Number(v) || v);
      else if (f.type === "checkbox") payload[f.key] = !!v;
      else payload[f.key] = v === "" ? undefined : v;
    });
    if (extraQuery) {
      Object.entries(extraQuery).forEach(([k, v]) => {
        if (!(k in payload)) payload[k] = v;
      });
    }
    const finalPayload = beforeSave ? beforeSave(payload) : payload;
    try {
      if (editing) await apiFetch(`${endpoint}/${editing.id}`, { method: "PUT", body: JSON.stringify(finalPayload) });
      else await apiFetch(endpoint, { method: "POST", body: JSON.stringify(finalPayload) });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : `Could not save the ${itemLabel.toLowerCase()}.`);
    } finally { setBusy(false); }
  }

  async function remove(row: AnyRecord) {
    const label = String(row.title || row.name || row.code || row.id);
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleting(String(row.id));
    try {
      await apiFetch(`${endpoint}/${row.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not delete the ${itemLabel.toLowerCase()}.`);
    } finally { setDeleting(null); }
  }

  const showActions = allowEdit || allowDelete || !!detailHref;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={load}>Refresh</Button>
            {headerActions}
            {allowCreate && <Button onClick={openCreate}>{createLabel || `+ Add ${itemLabel}`}</Button>}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="slate">TOTAL {total}</Badge>
        {searchPlaceholder && (
          <Input placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 max-w-xs" />
        )}
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title={emptyTitle || `No ${itemLabel.toLowerCase()}s yet`} subtitle={emptySubtitle || `Create your first ${itemLabel.toLowerCase()} to get started.`} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="sticky top-0 border-b border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-800/50">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 ${c.format === "inr" || c.format === "date" ? "text-right" : ""}`}>{c.label}</th>
                ))}
                {showActions && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {items.map((row) => (
                <tr key={String(row.id)} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  {columns.map((c) => (
                    <td key={c.key} className={`max-w-64 truncate px-4 py-3 ${c.format === "inr" || c.format === "date" ? "text-right tabular-nums" : ""}`}>{displayValue(row, c)}</td>
                  ))}
                  {showActions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {detailHref && <Link href={detailHref(row)}><Button variant="secondary" className="h-8 px-3 text-xs">{detailLabel}</Button></Link>}
                        {allowEdit && <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => openEdit(row)}>Edit</Button>}
                        {allowDelete && (
                          <Button variant="danger" className="h-8 px-3 text-xs" onClick={() => remove(row)} disabled={deleting === String(row.id)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? `Edit ${itemLabel}` : `Add ${itemLabel}`} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" || f.type === "multi" ? "sm:col-span-2" : ""}>
                <Field label={f.label} required={f.required} hint={f.hint}>
                  {f.type === "textarea" ? (
                    <Textarea rows={3} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} required={f.required} placeholder={f.placeholder} />
                  ) : f.type === "select" ? (
                    <Select value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                      <option value="">Select {f.label}</option>
                      {optionsFor(f).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  ) : f.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-brand-700" />
                      {f.label}
                    </label>
                  ) : f.type === "multi" ? (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-300 p-3 dark:border-stone-700">
                      {optionsFor(f).length === 0 && <p className="text-sm text-stone-500">No options available yet.</p>}
                      {optionsFor(f).map((o) => (
                        <label key={o.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={((form[f.key] as string[]) || []).includes(o.value)}
                            onChange={() => {
                              const cur = ((form[f.key] as string[]) || []);
                              set(f.key, cur.includes(o.value) ? cur.filter((x) => x !== o.value) : [...cur, o.value]);
                            }}
                            className="h-4 w-4 accent-brand-700"
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  ) : f.type === "file" ? (
                    <div>
                      <Input type="file" accept={f.accept} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(f, file); }} />
                      {uploading === f.key && <p className="mt-1 text-xs text-stone-500">Uploading...</p>}
                      {!!form[f.key] && <p className="mt-1 break-all text-xs text-stone-500">Uploaded: {String(form[f.key])}</p>}
                    </div>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : f.type === "url" ? "url" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
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
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || uploading !== null}>{busy ? "Saving..." : editing ? `Update ${itemLabel}` : `Add ${itemLabel}`}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
