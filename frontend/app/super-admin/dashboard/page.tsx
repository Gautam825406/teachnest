"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, formatINR, platformApi, type PlatformStats } from "@/lib/api";
import { BannerHeader, Button, Card, ErrorBox, Loading } from "@/components/ui";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await platformApi.stats());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load platform stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards: { label: string; value: string }[] = stats
    ? [
        { label: "Institutes", value: String(stats.institutes) },
        { label: "Active subscriptions", value: String(stats.active_subscriptions) },
        { label: "Students", value: String(stats.students) },
        { label: "Orders", value: String(stats.orders) },
        { label: "Total revenue", value: formatINR(stats.total_revenue) },
      ]
    : [];

  return (
    <div>
      <BannerHeader
        title="Platform dashboard"
        subtitle="Totals across every institute on this TeachNest deployment. All numbers come from the platform API — revenue counts only orders with status SUCCESS."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <ErrorBox message={error} />
      {loading ? (
        <Loading label="Loading platform stats..." />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label} className="p-5">
              <p className="text-[13px] font-medium text-stone-500 dark:text-stone-400">{c.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{c.value}</p>
            </Card>
          ))}
        </div>
      ) : (
        !error && <p className="text-sm text-stone-500">No stats available yet.</p>
      )}
    </div>
  );
}
