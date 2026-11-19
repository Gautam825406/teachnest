"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, type Settings } from "@/lib/api";
import { Button, Card, ErrorBox, Field, Input, Loading, PageHeader, Textarea } from "@/components/ui";

const TABS = [
  { id: "company", label: "Company Info" },
  { id: "about", label: "About Us (Team)" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "refund", label: "Refund Policy" },
  { id: "terms", label: "Terms & Conditions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("company");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings>({});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Settings>("/settings");
      setSettings(data);
      setForm(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load settings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Settings, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

  async function save() {
    setBusy(true); setError(null); setSuccess(null);
    try {
      const payload = { ...form, gst_rate: form.gst_rate === "" ? undefined : Number(form.gst_rate) };
      const data = await apiFetch<Settings>("/settings", { method: "PUT", body: JSON.stringify(payload) });
      setSettings(data); setForm(data); setEditing(false); setSuccess("Settings saved successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save settings."); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  if (!settings && error) return <ErrorBox message={error} />;

  const textTabField: Record<string, keyof Settings> = {
    about: "about_us", privacy: "privacy_policy", refund: "refund_policy", terms: "terms",
  };

  return (
    <div>
      <PageHeader title="Company Settings" subtitle="Update your core business details and online presence." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)}>{t.label}</Button>
        ))}
      </div>
      <ErrorBox message={error} />
      {success && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">{success}</div>}

      {tab === "company" && (
        <Card className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Company Information</h2>
              <p className="text-sm text-slate-500">Update your core business details and online presence.</p>
            </div>
            {editing ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setForm(settings || {}); setEditing(false); }}>Cancel</Button>
                <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save Details"}</Button>
              </div>
            ) : (
              <Button onClick={() => setEditing(true)}>Edit Details</Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name"><Input value={str(form.company_name)} onChange={(e) => set("company_name", e.target.value)} disabled={!editing} /></Field>
            <Field label="Email"><Input type="email" value={str(form.email)} onChange={(e) => set("email", e.target.value)} disabled={!editing} /></Field>
            <Field label="Phone"><Input value={str(form.phone)} onChange={(e) => set("phone", e.target.value)} disabled={!editing} /></Field>
            <Field label="Technical Support"><Input value={str(form.support_technical)} onChange={(e) => set("support_technical", e.target.value)} disabled={!editing} /></Field>
            <Field label="General Queries"><Input value={str(form.support_general)} onChange={(e) => set("support_general", e.target.value)} disabled={!editing} /></Field>
            <Field label="Billing Support"><Input value={str(form.support_billing)} onChange={(e) => set("support_billing", e.target.value)} disabled={!editing} /></Field>
            <Field label="Headquarters"><Input value={str(form.headquarters)} onChange={(e) => set("headquarters", e.target.value)} disabled={!editing} /></Field>
            <Field label="Website"><Input value={str(form.website)} onChange={(e) => set("website", e.target.value)} disabled={!editing} /></Field>
            <Field label="WhatsApp"><Input value={str(form.whatsapp)} onChange={(e) => set("whatsapp", e.target.value)} disabled={!editing} /></Field>
            <Field label="Instagram"><Input value={str(form.instagram)} onChange={(e) => set("instagram", e.target.value)} disabled={!editing} /></Field>
            <Field label="YouTube"><Input value={str(form.youtube)} onChange={(e) => set("youtube", e.target.value)} disabled={!editing} /></Field>
            <Field label="GST Rate (%)"><Input type="number" step="0.01" value={str(form.gst_rate)} onChange={(e) => set("gst_rate", e.target.value)} disabled={!editing} /></Field>
            <Field label="GSTIN"><Input value={str(form.gstin)} onChange={(e) => set("gstin", e.target.value)} disabled={!editing} placeholder="Not provided" /></Field>
          </div>
        </Card>
      )}

      {tab !== "company" && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{TABS.find((t) => t.id === tab)?.label}</h2>
          <Textarea rows={14} value={str(form[textTabField[tab]])} onChange={(e) => set(textTabField[tab], e.target.value)} placeholder={`Enter your ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} here...`} />
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save Details"}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
