"use client";
import { useCallback, useEffect, useState } from "react";
import { apiDownload, apiFetch, asList, formatDate, formatINR, ordersActionsApi, paymentsApi, type AnyRecord, type Order, type Paged } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select, Textarea } from "@/components/ui";

function studentName(o: Order): string {
  if (typeof o.student === "object" && o.student?.name) return o.student.name;
  return String(o.student_name || o.student || "—");
}
function contactOf(o: Order): string {
  return String(o.contact || o.phone || o.email || "—");
}
function amountOf(o: Order): number {
  return Number(o.amount ?? o.total_amount ?? 0);
}
function dateOf(o: Order): string {
  return String(o.date || o.created_at || "");
}
function itemsOf(o: Order): string {
  if (Array.isArray(o.items)) return o.items.map((i) => (typeof i === "string" ? i : (i as { title?: string; name?: string })?.title || (i as { title?: string; name?: string })?.name || JSON.stringify(i))).join(", ");
  if (typeof o.items === "string") return o.items;
  return "—";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [view, setView] = useState<"all" | "deactivated">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [students, setStudents] = useState<AnyRecord[]>([]);
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [deactivateOrder, setDeactivateOrder] = useState<Order | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payInfo, setPayInfo] = useState<Record<string, string>>({});
  const [payChecking, setPayChecking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "deactivated") {
        const data = await ordersActionsApi.deactivated();
        const { items, total: t } = asList(data as never);
        setOrders(items as Order[]);
        setTotal(t);
      } else {
        const q = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (search) q.set("search", search);
        if (status) q.set("status", status);
        const data = await apiFetch<Paged<Order> | Order[]>(`/orders?${q.toString()}`);
        if (Array.isArray(data)) { setOrders(data); setTotal(data.length); }
        else { setOrders(data.items || []); setTotal(data.total ?? (data.items || []).length); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load orders."); }
    finally { setLoading(false); }
  }, [search, status, page, perPage, view]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiFetch<unknown>("/students?per_page=100").then((d) => {
      const { items } = asList(d as never);
      setStudents(items as AnyRecord[]);
    }).catch(() => undefined);
  }, []);

  async function exportCsv() {
    setExporting(true);
    try { await apiDownload("/orders/export", "orders.csv"); }
    catch (e) { setError(e instanceof Error ? e.message : "Export failed."); }
    finally { setExporting(false); }
  }

  async function doTransfer() {
    if (!transferOrder || !transferTo) return;
    setBusy(true);
    setActionError(null);
    try {
      await ordersActionsApi.transfer(transferOrder.id, Number(transferTo) || transferTo);
      setTransferOrder(null);
      setTransferTo("");
      load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Could not transfer the order."); }
    finally { setBusy(false); }
  }

  async function doRefund() {
    if (!refundOrder) return;
    setBusy(true);
    setActionError(null);
    try {
      await ordersActionsApi.refund(refundOrder.id, refundReason);
      setRefundOrder(null);
      setRefundReason("");
      load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Could not refund the order."); }
    finally { setBusy(false); }
  }

  async function doDeactivate() {
    if (!deactivateOrder) return;
    setBusy(true);
    setActionError(null);
    try {
      await ordersActionsApi.deactivate(deactivateOrder.id);
      setDeactivateOrder(null);
      load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Could not deactivate the order."); }
    finally { setBusy(false); }
  }

  async function checkPayment(o: Order) {
    const key = String(o.id);
    setPayChecking(key);
    // Payment records are keyed by the Cashfree order id (e.g. "TN-..."), which
    // the legacy order row may carry as transaction_id; fall back to the row id.
    const candidates = [String(o.transaction_id || ""), key].filter((c, i, a) => c && a.indexOf(c) === i);
    let lastError = "Payment lookup failed.";
    for (const candidate of candidates) {
      try {
        const res = await paymentsApi.get(candidate);
        const cfId = String(res.cashfree_order_id || "");
        const status = String(res.payment_status || res.status || "");
        setPayInfo((prev) => ({ ...prev, [key]: `${cfId ? `Cashfree: ${cfId}` : "Cashfree order id not recorded"}${status ? ` • ${status}` : ""}` }));
        setPayChecking(null);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Payment lookup failed.";
      }
    }
    setPayInfo((prev) => ({ ...prev, [key]: lastError }));
    setPayChecking(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <BannerHeader
        title="All Orders"
        subtitle="Purchases and orders placed by your students."
        actions={
          <>
            <Button variant="secondary" onClick={load}>Refresh</Button>
            <Button onClick={exportCsv} disabled={exporting}>{exporting ? "Exporting..." : "Export"}</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={view === "all" ? "primary" : "secondary"} onClick={() => { setView("all"); setPage(1); }}>All Orders</Button>
        <Button variant={view === "deactivated" ? "primary" : "secondary"} onClick={() => { setView("deactivated"); setPage(1); }}>Deactivated Courses</Button>
      </div>
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Search orders..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="max-w-48">
            <option value="">All statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </Select>
          <label className="ml-auto flex items-center gap-2 text-sm">
            Per page
            <Select value={String(perPage)} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="w-20">
              <option value="10">10</option><option value="100">100</option><option value="500">500</option><option value="1000">1000</option>
            </Select>
          </label>
        </div>
      </Card>
      <ErrorBox message={error} />
      {loading ? <Loading /> : orders.length === 0 ? (
        <EmptyState title={view === "deactivated" ? "No deactivated courses" : "No orders yet"} subtitle={view === "deactivated" ? "Deactivated course orders will appear here." : "Orders will appear here once students make a purchase."} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">STUDENT</th>
                <th className="px-4 py-3 font-semibold">CONTACT</th>
                <th className="px-4 py-3 font-semibold">STATUS</th>
                <th className="px-4 py-3 font-semibold">TRANSACTION ID</th>
                <th className="px-4 py-3 font-semibold">CASHFREE / PAYMENT</th>
                <th className="px-4 py-3 font-semibold">DATE &amp; AMOUNT</th>
                <th className="px-4 py-3 font-semibold">ITEMS</th>
                <th className="px-4 py-3 font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {orders.map((o) => (
                <tr key={String(o.id)}>
                  <td className="px-4 py-3 font-medium">{studentName(o)}</td>
                  <td className="px-4 py-3">{contactOf(o)}</td>
                  <td className="px-4 py-3"><Badge tone={String(o.status).toUpperCase() === "SUCCESS" ? "green" : String(o.status).toUpperCase() === "PENDING" ? "amber" : "slate"}>{String(o.status || "—")}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs">{String(o.transaction_id || o.id)}</td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const cfId = String((o as AnyRecord).cashfree_order_id || "");
                      const pStatus = String((o as AnyRecord).payment_status || "");
                      const lookedUp = payInfo[String(o.id)];
                      if (lookedUp) return <span>{lookedUp}</span>;
                      if (cfId || pStatus) return <span className="font-mono">{cfId || "—"}{pStatus ? ` • ${pStatus}` : ""}</span>;
                      return (
                        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => checkPayment(o)} disabled={payChecking === String(o.id)}>
                          {payChecking === String(o.id) ? "Checking..." : "Check payment"}
                        </Button>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">{formatDate(dateOf(o))}<br /><span className="font-semibold">{formatINR(amountOf(o))}</span></td>
                  <td className="max-w-48 truncate px-4 py-3">{itemsOf(o)}</td>
                  <td className="px-4 py-3">
                    {view === "all" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => { setTransferOrder(o); setTransferTo(""); setActionError(null); }}>Transfer</Button>
                        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => { setRefundOrder(o); setRefundReason(""); setActionError(null); }}>Refund</Button>
                        <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => { setDeactivateOrder(o); setActionError(null); }}>Deactivate</Button>
                      </div>
                    ) : (
                      <span className="text-slate-500">Deactivated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <div className="mt-6 flex items-center justify-center gap-3 text-sm">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span>Page {page} of {totalPages} • {total} orders</span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>

      <Modal open={!!transferOrder} title="Transfer Order" onClose={() => setTransferOrder(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Transfer order {transferOrder ? String(transferOrder.transaction_id || transferOrder.id) : ""} ({transferOrder ? studentName(transferOrder) : ""}) to another student.
          </p>
          <Field label="Transfer To Student" required>
            <Select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} required>
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>{String(s.name || s.full_name || s.id)} {s.phone ? `— ${s.phone}` : ""}</option>
              ))}
            </Select>
          </Field>
          <ErrorBox message={actionError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTransferOrder(null)}>Cancel</Button>
            <Button onClick={doTransfer} disabled={busy || !transferTo}>{busy ? "Transferring..." : "Transfer Order"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!refundOrder} title="Refund Order" onClose={() => setRefundOrder(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Refund order {refundOrder ? String(refundOrder.transaction_id || refundOrder.id) : ""} ({refundOrder ? formatINR(amountOf(refundOrder)) : ""}).
          </p>
          <Field label="Refund Reason" required>
            <Textarea rows={3} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Why is this order being refunded?" />
          </Field>
          <ErrorBox message={actionError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRefundOrder(null)}>Cancel</Button>
            <Button onClick={doRefund} disabled={busy || !refundReason.trim()}>{busy ? "Refunding..." : "Refund Order"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deactivateOrder} title="Deactivate Order" onClose={() => setDeactivateOrder(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Deactivate this order? The student will lose access to the purchased course content.
          </p>
          <ErrorBox message={actionError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeactivateOrder(null)}>Cancel</Button>
            <Button variant="danger" onClick={doDeactivate} disabled={busy}>{busy ? "Deactivating..." : "Deactivate"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
