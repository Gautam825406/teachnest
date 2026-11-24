"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, formatDate, platformApi, type PlatformInstitute, type PlatformPlan } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, ErrorBox, Field, Loading, Select } from "@/components/ui";

export default function SuperAdminInstituteDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [inst, setInst] = useState<PlatformInstitute | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [planId, setPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subStatus, setSubStatus] = useState("active");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await platformApi.institutes.get(id);
      setInst(data);
      if (data.subscription?.plan_id) setPlanId(String(data.subscription.plan_id));
      if (data.subscription?.billing_cycle === "yearly" || data.subscription?.billing_cycle === "monthly") {
        setBillingCycle(data.subscription.billing_cycle);
      }
      if (data.subscription?.status) setSubStatus(data.subscription.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this institute.");
    }
    try {
      const res = await platformApi.plans.list();
      setPlans(Array.isArray(res) ? res : res.plans || []);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSuspend() {
    if (!inst) return;
    const next = !inst.suspended;
    setBusy("suspend");
    setError(null);
    setNotice(null);
    try {
      await platformApi.institutes.setStatus(inst.id, next);
      setInst({ ...inst, suspended: next });
      setNotice(next ? "Institute suspended." : "Institute activated.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update institute status.");
    } finally {
      setBusy(null);
    }
  }

  async function assignSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) {
      setError("Choose a plan first.");
      return;
    }
    setBusy("subscription");
    setError(null);
    setNotice(null);
    try {
      const sub = await platformApi.institutes.assignSubscription(id, {
        plan_id: Number(planId),
        billing_cycle: billingCycle,
        status: subStatus,
      });
      setInst((prev) => (prev ? { ...prev, subscription: sub } : prev));
      setNotice(`Subscription assigned — ${sub.plan_name || "plan"} (${sub.billing_cycle}, ${sub.status}).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not assign the subscription.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading label="Loading institute..." />;

  return (
    <div>
      <BannerHeader
        title={inst ? inst.name : "Institute"}
        subtitle={inst ? `Org code ${inst.org_code} · Joined ${formatDate(inst.created_at)}` : undefined}
        actions={
          <div className="flex gap-2">
            <Link href="/super-admin/institutes">
              <Button variant="secondary">Back to institutes</Button>
            </Link>
            {inst && (
              <Button variant={inst.suspended ? "primary" : "danger"} onClick={toggleSuspend} disabled={busy === "suspend"}>
                {busy === "suspend" ? "Updating..." : inst.suspended ? "Activate institute" : "Suspend institute"}
              </Button>
            )}
          </div>
        }
      />
      <ErrorBox message={error} />
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </div>
      )}
      {!inst ? (
        <p className="text-sm text-stone-500">Institute not found.</p>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Overview</h2>
              {inst.suspended ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Users", value: String(inst.counts?.users ?? 0) },
                { label: "Students", value: String(inst.counts?.students ?? 0) },
                { label: "Courses", value: String(inst.counts?.courses ?? 0) },
                { label: "Orders", value: String(inst.counts?.orders ?? 0) },
              ].map((s) => (
                <div key={s.label} className="rounded-[10px] border border-stone-200 p-4 dark:border-stone-800">
                  <p className="text-[13px] text-stone-500 dark:text-stone-400">{s.label}</p>
                  <p className="mt-1 text-xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
            {inst.admins && inst.admins.length > 0 && (
              <div className="mt-4">
                <p className="text-[13px] font-medium text-stone-500 dark:text-stone-400">Admins</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {inst.admins.map((a) => (
                    <li key={String(a.id ?? a.username)}>
                      <span className="font-medium">{a.username}</span>
                      {a.email ? <span className="text-stone-500"> · {a.email}</span> : null}
                      {a.role ? <span className="text-stone-500"> · {a.role}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Subscription</h2>
            {inst.subscription ? (
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Current: <span className="font-medium text-stone-900 dark:text-stone-100">{inst.subscription.plan_name || "—"}</span>
                {" · "}{inst.subscription.billing_cycle} · {inst.subscription.status}
                {inst.subscription.ends_at ? ` · ends ${formatDate(inst.subscription.ends_at)}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No subscription assigned yet.</p>
            )}
            <form onSubmit={assignSubscription} className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Plan" required>
                <Select value={planId} onChange={(e) => setPlanId(e.target.value)} required>
                  <option value="">Choose a plan</option>
                  {plans.filter((p) => p.active !== false).map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Billing cycle" required>
                <Select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")} required>
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="yearly">Yearly (365 days)</option>
                </Select>
              </Field>
              <Field label="Status" required>
                <Select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} required>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past due</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={busy === "subscription" || plans.length === 0}>
                  {busy === "subscription" ? "Assigning..." : "Assign subscription"}
                </Button>
                {plans.length === 0 && <p className="mt-2 text-xs text-stone-500">No plans available — create one on the Plans page first.</p>}
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Cashfree (read-only)</h2>
            <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">
              Payment keys are managed by the institute admin in their own Integrations page. The platform panel shows status only — full keys are never visible here.
            </p>
            {inst.cashfree ? (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  Status:{" "}
                  {inst.cashfree.configured ? (
                    <Badge tone="green">Configured</Badge>
                  ) : (
                    <Badge tone="slate">Not configured</Badge>
                  )}
                </p>
                <p className="text-stone-600 dark:text-stone-300">Environment: {inst.cashfree.environment || "—"}</p>
                <p className="text-stone-600 dark:text-stone-300">Source: {inst.cashfree.source || "—"}</p>
                {(inst.cashfree.masked_app_id || inst.cashfree.masked) && (
                  <p className="text-stone-600 dark:text-stone-300">
                    App ID: <span className="font-mono">{inst.cashfree.masked_app_id || inst.cashfree.masked}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-500">Cashfree status unavailable.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
