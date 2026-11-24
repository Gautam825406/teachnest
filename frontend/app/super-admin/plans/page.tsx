"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, formatINR, platformApi, platformPlanFeatures, type PlatformPlan } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Textarea } from "@/components/ui";

interface PlanForm {
  name: string;
  monthly: string;
  yearly: string;
  features: string;
  active: boolean;
}

const EMPTY_FORM: PlanForm = { name: "", monthly: "", yearly: "", features: "", active: true };

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.plans.list();
      setPlans(Array.isArray(res) ? res : res.plans || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function startEdit(plan: PlatformPlan) {
    setEditingId(String(plan.id));
    setForm({
      name: plan.name,
      monthly: String(plan.monthly_price_inr ?? 0),
      yearly: String(plan.yearly_price_inr ?? 0),
      features: platformPlanFeatures(plan).join(", "),
      active: plan.active !== false,
    });
    setFormError(null);
  }

  function parseFeatures(): string[] {
    return form.features.split(",").map((s) => s.trim()).filter(Boolean);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const monthly = Number(form.monthly);
    const yearly = Number(form.yearly);
    if (!form.name.trim()) {
      setFormError("Plan name is required.");
      return;
    }
    if (Number.isNaN(monthly) || monthly < 0 || Number.isNaN(yearly) || yearly < 0) {
      setFormError("Monthly and yearly prices must be numbers of 0 or more.");
      return;
    }
    setBusy("form");
    try {
      if (editingId) {
        await platformApi.plans.update(editingId, {
          name: form.name.trim(),
          monthly_price_inr: monthly,
          yearly_price_inr: yearly,
          features: parseFeatures(),
          active: form.active,
        });
        setNotice("Plan updated.");
      } else {
        await platformApi.plans.create({
          name: form.name.trim(),
          monthly_price_inr: monthly,
          yearly_price_inr: yearly,
          features: parseFeatures(),
          active: form.active,
        });
        setNotice("Plan created.");
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save the plan.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete(plan: PlatformPlan) {
    setBusy(`delete-${plan.id}`);
    setError(null);
    setNotice(null);
    try {
      await platformApi.plans.remove(plan.id);
      setNotice(`Plan “${plan.name}” deactivated.`);
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the plan.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <BannerHeader
        title="Subscription plans"
        subtitle="Plans the platform offers to institutes. Starter (₹0) and Growth (₹999/month, ₹9,999/year) are the defaults seeded when no plans exist — edit them here or add your own."
      />
      <ErrorBox message={error} />
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </div>
      )}

      <Card className="mb-6 p-5">
        <h2 className="text-base font-semibold">{editingId ? "Edit plan" : "Create plan"}</h2>
        <form onSubmit={submitForm} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Plan name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Growth" />
            </Field>
            <Field label="Monthly price (₹)" required>
              <Input type="number" min="0" step="1" value={form.monthly} onChange={(e) => setForm((f) => ({ ...f, monthly: e.target.value }))} required placeholder="999" />
            </Field>
            <Field label="Yearly price (₹)" required>
              <Input type="number" min="0" step="1" value={form.yearly} onChange={(e) => setForm((f) => ({ ...f, yearly: e.target.value }))} required placeholder="9999" />
            </Field>
          </div>
          <Field label="Features" hint="Comma-separated, e.g. Unlimited students, Live classes, AI question generator.">
            <Textarea rows={2} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} placeholder="Unlimited students, Live classes, AI question generator" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 accent-brand-700"
            />
            Active (inactive plans cannot be assigned to institutes)
          </label>
          <ErrorBox message={formError} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy === "form"}>{busy === "form" ? "Saving..." : editingId ? "Save changes" : "Create plan"}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={startCreate}>Cancel edit</Button>
            )}
          </div>
        </form>
      </Card>

      {loading ? (
        <Loading label="Loading plans..." />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans yet" subtitle="Create your first plan above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-[13px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Monthly</th>
                <th className="px-4 py-3 font-medium">Yearly</th>
                <th className="px-4 py-3 font-medium">Features</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={String(plan.id)} className="border-b border-stone-100 align-top last:border-0 dark:border-stone-800">
                  <td className="px-4 py-3 font-medium">{plan.name}</td>
                  <td className="px-4 py-3">{formatINR(plan.monthly_price_inr)}</td>
                  <td className="px-4 py-3">{formatINR(plan.yearly_price_inr)}</td>
                  <td className="px-4 py-3 text-[13px] text-stone-600 dark:text-stone-300">
                    {platformPlanFeatures(plan).length > 0 ? platformPlanFeatures(plan).join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {plan.active !== false ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {deleteId === String(plan.id) ? (
                      <span className="flex flex-wrap gap-2">
                        <Button variant="danger" disabled={busy !== null} onClick={() => confirmDelete(plan)}>
                          {busy === `delete-${plan.id}` ? "Deleting..." : "Confirm delete"}
                        </Button>
                        <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                      </span>
                    ) : (
                      <span className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => startEdit(plan)}>Edit</Button>
                        <Button variant="danger" onClick={() => setDeleteId(String(plan.id))}>Delete</Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-xs text-stone-500">
        Deleting a plan deactivates it (soft-delete). A plan with subscriptions cannot be deleted.
      </p>
    </div>
  );
}
