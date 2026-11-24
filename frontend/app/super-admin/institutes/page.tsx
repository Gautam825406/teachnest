"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, formatDate, platformApi, type PlatformInstitute } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal } from "@/components/ui";

const PAGE_SIZE = 50;

export default function SuperAdminInstitutesPage() {
  const [institutes, setInstitutes] = useState<PlatformInstitute[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ institute_name: "", admin_name: "", admin_username: "", email: "", phone: "", password: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [created, setCreated] = useState<{ org_code: string; admin_username: string; institute_name?: string } | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await platformApi.institutes.list(query, 0, PAGE_SIZE);
      setInstitutes(data.items || []);
      setTotal(data.total ?? (data.items || []).length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load institutes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(search);
  }, [search, load]);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  async function toggleSuspend(inst: PlatformInstitute) {
    const next = !inst.suspended;
    setBusyId(String(inst.id));
    setError(null);
    try {
      await platformApi.institutes.setStatus(inst.id, next);
      setInstitutes((prev) => prev.map((i) => (String(i.id) === String(inst.id) ? { ...i, suspended: next } : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update institute status.");
    } finally {
      setBusyId(null);
    }
  }

  function openModal() {
    setForm({ institute_name: "", admin_name: "", admin_username: "", email: "", phone: "", password: "" });
    setFormError(null);
    setCreated(null);
    setModalOpen(true);
  }

  async function submitOnboard(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreated(null);
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setFormBusy(true);
    try {
      const res = await platformApi.institutes.create({
        institute_name: form.institute_name.trim(),
        admin_name: form.admin_name.trim(),
        admin_username: form.admin_username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setCreated({ org_code: res.org_code, admin_username: res.admin_username, institute_name: res.institute_name });
      setForm({ institute_name: "", admin_name: "", admin_username: "", email: "", phone: "", password: "" });
      load(search);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not onboard the institute.");
    } finally {
      setFormBusy(false);
    }
  }

  return (
    <div>
      <BannerHeader
        title="Institutes"
        subtitle="Every institute on this TeachNest deployment. Search by name or org code."
        actions={<Button onClick={openModal}>Onboard institute</Button>}
      />
      <ErrorBox message={error} />

      <Card className="mb-4 p-4">
        <Field label="Search institutes">
          <Input
            placeholder="Search by institute name or org code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
      </Card>

      {loading ? (
        <Loading label="Loading institutes..." />
      ) : institutes.length === 0 ? (
        <EmptyState
          title="No institutes found"
          subtitle={search ? "Try a different search." : "Onboard your first institute to get started."}
          action={<Button onClick={openModal}>Onboard institute</Button>}
        />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-stone-500 dark:text-stone-400">
            Showing {institutes.length} of {total} institute{total === 1 ? "" : "s"}.
          </p>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[13px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <th className="px-4 py-3 font-medium">Institute</th>
                  <th className="px-4 py-3 font-medium">Org code</th>
                  <th className="px-4 py-3 font-medium">Counts</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Cashfree</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map((inst) => (
                  <tr key={String(inst.id)} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                    <td className="px-4 py-3">
                      <Link href={`/super-admin/institutes/${inst.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                        {inst.name}
                      </Link>
                      <p className="text-xs text-stone-500">Joined {formatDate(inst.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px]">{inst.org_code}</td>
                    <td className="px-4 py-3 text-[13px] text-stone-600 dark:text-stone-300">
                      {inst.counts?.students ?? 0} students · {inst.counts?.courses ?? 0} courses · {inst.counts?.orders ?? 0} orders
                    </td>
                    <td className="px-4 py-3 text-[13px]">
                      {inst.subscription ? (
                        <>
                          <span className="font-medium">{inst.subscription.plan_name || "—"}</span>
                          <p className="text-xs text-stone-500">
                            {inst.subscription.billing_cycle} · {inst.subscription.status}
                            {inst.subscription.ends_at ? ` · ends ${formatDate(inst.subscription.ends_at)}` : ""}
                          </p>
                        </>
                      ) : (
                        <span className="text-stone-500">No subscription</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inst.cashfree?.configured ? (
                        <Badge tone="green">Configured{inst.cashfree.environment ? ` · ${inst.cashfree.environment}` : ""}</Badge>
                      ) : (
                        <Badge tone="slate">Not configured</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inst.suspended ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        disabled={busyId === String(inst.id)}
                        onClick={() => toggleSuspend(inst)}
                      >
                        {busyId === String(inst.id) ? "Updating..." : inst.suspended ? "Activate" : "Suspend"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Modal open={modalOpen} title="Onboard institute" onClose={() => setModalOpen(false)}>
        {created && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <p className="font-medium">Institute onboarded.</p>
            <p className="mt-1">
              Org code: <span className="font-mono font-medium">{created.org_code}</span>
              {" · "}Admin username: <span className="font-mono font-medium">{created.admin_username}</span>
            </p>
            <p className="mt-1 text-xs">Share the org code and admin username with the institute admin so they can log in.</p>
          </div>
        )}
        <form onSubmit={submitOnboard} className="space-y-4">
          <Field label="Institute name" required>
            <Input value={form.institute_name} onChange={(e) => setForm((f) => ({ ...f, institute_name: e.target.value }))} required placeholder="e.g. BM Arts Academy" />
          </Field>
          <Field label="Admin name" required>
            <Input value={form.admin_name} onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))} required placeholder="Full name of the institute admin" />
          </Field>
          <Field label="Admin username" required hint="At least 3 characters. Usernames are unique across all institutes.">
            <Input value={form.admin_username} onChange={(e) => setForm((f) => ({ ...f, admin_username: e.target.value }))} required placeholder="e.g. bma-admin" autoComplete="off" />
          </Field>
          <Field label="Admin email" required>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required placeholder="admin@example.com" autoComplete="off" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 919876543210" autoComplete="off" />
          </Field>
          <Field label="Admin password" required hint="At least 6 characters. The institute admin can change it later.">
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required placeholder="Set an initial password" autoComplete="new-password" />
          </Field>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
            <Button type="submit" disabled={formBusy}>{formBusy ? "Onboarding..." : "Onboard institute"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
