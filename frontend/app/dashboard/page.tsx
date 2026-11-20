"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, formatINR, getStoredUser, integrationsStatusApi, paymentsApi, toISODate, type DashboardStats, type IntegrationStatus, type PaymentOrder } from "@/lib/api";
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, Select } from "@/components/ui";

const CAROUSEL = [
  {
    title: "AI — Generate question papers instantly using AI!",
    body: "Simply upload any PDF, TXT, XLSX, CSV, image, or DOCX file and let AI build your question paper.",
    link: "/dashboard/ai-generator",
    linkLabel: "Try AI Generator →",
  },
  {
    title: "IMPORTANT: Purchased storage is billed monthly and is non-refundable after allocation.",
    body: "Review your video storage usage below before buying additional storage for your institute.",
    link: "/dashboard/settings",
    linkLabel: "View Storage Plan →",
  },
];

export default function DashboardPage() {
  const [user] = useState(() => getStoredUser());
  const today = new Date();
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(toISODate(weekAgo));
  const [endDate, setEndDate] = useState(toISODate(today));
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [courseFilter, setCourseFilter] = useState("all");
  const [gwStatus, setGwStatus] = useState<IntegrationStatus | null>(null);
  const [payModal, setPayModal] = useState<"wallet" | "storage" | null>(null);
  const [payAmount, setPayAmount] = useState("500");
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payOrder, setPayOrder] = useState<PaymentOrder | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const load = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardStats>(
        `/dashboard/stats?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`
      );
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard statistics.");
    } finally {
      setLoading(false);
    }
    try {
      const s = await integrationsStatusApi.get();
      setGwStatus(s);
    } catch {
      setGwStatus(null); // gateway card falls back to "status unavailable"
    }
  }, []);

  useEffect(() => { load(startDate, endDate); }, []); // initial load only; Apply Filter re-fetches
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % CAROUSEL.length), 6000);
    return () => clearInterval(t);
  }, []);

  function openPayModal(kind: "wallet" | "storage") {
    setPayModal(kind);
    setPayAmount(kind === "wallet" ? "500" : "999");
    setPayError(null);
    setPayOrder(null);
    setVerifyResult(null);
  }

  async function createPaymentOrder() {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a valid amount greater than 0.");
      return;
    }
    setPayBusy(true);
    setPayError(null);
    setVerifyResult(null);
    try {
      const order = await paymentsApi.createOrder({ item_type: payModal, amount });
      setPayOrder(order);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Could not create the payment order.");
    } finally { setPayBusy(false); }
  }

  async function verifyPayment() {
    const orderId = payOrder?.order_id ?? payOrder?.cashfree_order_id;
    if (!orderId) return;
    setVerifyBusy(true);
    setVerifyResult(null);
    try {
      const res = await paymentsApi.verifyReturn(orderId);
      const status = String(res.payment_status || res.status || "unknown");
      setVerifyResult(`Payment status: ${status}.`);
      if (status.toUpperCase() === "SUCCESS" || status.toUpperCase() === "PAID") load(startDate, endDate);
    } catch (e) {
      setVerifyResult(e instanceof Error ? e.message : "Could not verify the payment yet.");
    } finally { setVerifyBusy(false); }
  }

  const storageMb = stats?.video_storage_mb ?? 0;
  const limitGb = stats?.video_storage_limit_gb ?? 1024;
  const limitMb = limitGb * 1024;
  const storagePct = limitMb > 0 ? Math.min(100, (storageMb / limitMb) * 100) : 0;
  const gw = stats?.payment_gateway;
  const cashfreeConfigured = gwStatus?.cashfree?.configured === true;
  const cashfreeEnv = gwStatus?.cashfree?.env;

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "Today's Earnings", value: formatINR(stats?.todays_earnings), sub: "Online & Offline" },
    { label: "Recently Joined", value: String(stats?.recently_joined ?? 0) },
    { label: "Total Earnings", value: formatINR(stats?.total_earnings) },
    { label: "Total Classes Taken", value: String(stats?.total_classes_taken ?? 0) },
    { label: "Total Courses", value: String(stats?.total_courses ?? 0) },
    { label: "Total Students", value: String(stats?.total_students ?? 0) },
    { label: "Total Teachers", value: String(stats?.total_teachers ?? 0) },
    { label: "Total Orders", value: String(stats?.total_orders ?? 0) },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">Home</p>
        </div>
        <Link href="/dashboard/coming-soon?feature=Help%20%26%20Support">
          <Button variant="secondary">Help &amp; Support</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Welcome back, {user?.tenant_name || user?.username || "Institute"}</h2>
          <p className="mt-1 text-sm text-slate-500">Track your earnings, manage your courses activity and take control over your app.</p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Wallet Balance</p>
            <p className="text-lg font-bold">{formatINR(stats?.wallet_balance)}</p>
          </div>
          <Button variant="secondary" className="px-3" title="Top up wallet via Cashfree" onClick={() => openPayModal("wallet")}>+</Button>
        </Card>
      </div>

      {/* Updates & News carousel */}
      <Card className="mb-6 bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white dark:from-indigo-900 dark:to-slate-900">
        <p className="text-xs font-semibold tracking-wider text-indigo-200">UPDATES &amp; NEWS</p>
        <h3 className="mt-2 text-lg font-bold">{CAROUSEL[slide].title}</h3>
        <p className="mt-1 text-sm text-indigo-100">{CAROUSEL[slide].body}</p>
        <Link href={CAROUSEL[slide].link} className="mt-3 inline-block text-sm font-semibold underline">{CAROUSEL[slide].linkLabel}</Link>
        <div className="mt-4 flex gap-2">
          {CAROUSEL.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} aria-label={`Show update ${i + 1}`} className={`h-2 w-8 rounded-full ${i === slide ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      </Card>

      {/* Filter analytics */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-sm font-semibold">FILTER ANALYTICS</p>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" />
            </div>
          </div>
          <Button onClick={() => load(startDate, endDate)}>Search</Button>
          <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>FILTERS</Button>
        </div>
        {showFilters && (
          <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-3 text-sm font-semibold">Analytics Filters</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Filter by date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Course</label>
                <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  <option value="all">All courses</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => { setShowFilters(false); load(startDate, endDate); }}>Apply Filter</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ErrorBox message={error} />
      {loading && !stats ? (
        <Loading label="Loading dashboard statistics..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label} className="p-4">
                <p className="text-xs font-semibold tracking-wider text-slate-500">{c.label.toUpperCase()}</p>
                <p className="mt-2 text-2xl font-bold">{c.value}</p>
                {c.sub && <p className="mt-1 text-xs text-slate-500">{c.sub}</p>}
              </Card>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="text-xs font-semibold tracking-wider text-slate-500">VIDEO STORAGE</p>
              <p className="mt-2 text-2xl font-bold">{storageMb.toLocaleString("en-IN")} MB <span className="text-base font-medium text-slate-500">of {(limitGb).toFixed(2)} TB</span></p>
              <p className="mt-1 text-sm text-slate-500">Plan: {stats?.storage_plan || "FREE"} — {storagePct.toFixed(1)}% used</p>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.max(storagePct, 1)}%` }} />
              </div>
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/settings"><Button variant="secondary">Storage Plan</Button></Link>
                <Button variant="secondary" onClick={() => openPayModal("storage")}>Buy Storage</Button>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold tracking-wider text-slate-500">PAYMENT GATEWAY</p>
              <p className="mt-2 text-2xl font-bold">
                Cashfree{" "}
                {gwStatus ? (
                  <Badge tone={cashfreeConfigured ? "green" : "slate"}>
                    {cashfreeConfigured ? `CONFIGURED${cashfreeEnv ? ` — ${cashfreeEnv}` : ""}` : "NOT CONFIGURED"}
                  </Badge>
                ) : (
                  <Badge tone="slate">STATUS UNAVAILABLE</Badge>
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {gwStatus
                  ? cashfreeConfigured
                    ? `Cashfree is configured${cashfreeEnv ? ` (${cashfreeEnv})` : ""}. Student payments go through Cashfree.`
                    : "Not configured — set CASHFREE_APP_ID / CASHFREE_SECRET_KEY in Render."
                  : "Live gateway status is unavailable right now — the backend integration-status endpoint did not respond."}
              </p>
              {gw?.merchant_id && <p className="mt-1 text-sm text-slate-500">Merchant ID: {gw.merchant_id}</p>}
              <p className="mt-2 text-sm text-emerald-600">Secure API Channel</p>
              <div className="mt-3">
                <Link href="/dashboard/integrations"><Button variant="secondary">View Integrations</Button></Link>
              </div>
            </Card>
          </div>
        </>
      )}

      <Modal open={payModal !== null} title={payModal === "wallet" ? "Wallet Top-up" : "Buy Storage"} onClose={() => setPayModal(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {payModal === "wallet"
              ? "Top up your institute wallet. You will be taken to Cashfree to complete the payment."
              : "Buy additional video storage. You will be taken to Cashfree to complete the payment."}
          </p>
          {!payOrder ? (
            <>
              <Field label="Amount (Rs.)" required>
                <Input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              </Field>
              <ErrorBox message={payError} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
                <Button onClick={createPaymentOrder} disabled={payBusy}>{payBusy ? "Creating order..." : "Create Payment Order"}</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                Order created: <span className="font-mono text-xs">{String(payOrder.cashfree_order_id || payOrder.order_id || "—")}</span>
                {" • "}Amount: <span className="font-semibold">{formatINR(payOrder.amount_rupees ?? (payOrder.amount ? payOrder.amount / 100 : Number(payAmount)))}</span>
              </p>
              {payOrder.payment_link ? (
                <p className="text-sm">
                  <a href={payOrder.payment_link} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline">
                    Open Cashfree payment page (new tab) →
                  </a>
                </p>
              ) : (
                <p className="text-sm text-slate-500">No payment link was returned for this order.</p>
              )}
              <ErrorBox message={payError} />
              {verifyResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  {verifyResult}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>Close</Button>
                <Button onClick={verifyPayment} disabled={verifyBusy}>{verifyBusy ? "Verifying..." : "Verify payment"}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
