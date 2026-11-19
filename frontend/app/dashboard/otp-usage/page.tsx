"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, formatDate, otpUsageApi, type OtpUsage } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Input, Loading } from "@/components/ui";

export default function OtpUsagePage() {
  const [rows, setRows] = useState<OtpUsage[]>([]);
  const [total, setTotal] = useState(0);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await otpUsageApi.list(mobile.trim() || undefined);
      const { items, total: t } = asList(data as never);
      setRows(items as OtpUsage[]);
      setTotal(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load OTP usage.");
    } finally { setLoading(false); }
  }, [mobile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <BannerHeader
        title="OTP Usage"
        subtitle="One-time passwords sent to student mobile numbers."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {total}</Badge>
        <Input
          placeholder="Search by mobile number..."
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="max-w-xs"
          inputMode="numeric"
        />
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState title="No OTP records found" subtitle="Try a different mobile number, or OTPs will appear here once students log in." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">MOBILE</th>
                <th className="px-4 py-3 font-semibold">OTP</th>
                <th className="px-4 py-3 font-semibold">SENT AT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td className="px-4 py-3 font-medium">{String(r.mobile || "—")}</td>
                  <td className="px-4 py-3 font-mono">{String(r.otp || "—")}</td>
                  <td className="px-4 py-3">{formatDate(String(r.created_at || ""))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
