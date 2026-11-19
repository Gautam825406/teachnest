"use client";
import { useCallback, useEffect, useState } from "react";
import { apiDownload, apiFetch, formatDate, formatINR, type Order, type Paged } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Input, Loading, Select } from "@/components/ui";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      const data = await apiFetch<Paged<Order> | Order[]>(`/orders?${q.toString()}`);
      if (Array.isArray(data)) { setOrders(data); setTotal(data.length); }
      else { setOrders(data.items || []); setTotal(data.total ?? (data.items || []).length); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load orders."); }
    finally { setLoading(false); }
  }, [search, status, page, perPage]);

  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    setExporting(true);
    try { await apiDownload("/orders/export", "orders.csv"); }
    catch (e) { setError(e instanceof Error ? e.message : "Export failed."); }
    finally { setExporting(false); }
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
        <EmptyState title="No orders yet" subtitle="Orders will appear here once students make a purchase." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">STUDENT</th>
                <th className="px-4 py-3 font-semibold">CONTACT</th>
                <th className="px-4 py-3 font-semibold">STATUS</th>
                <th className="px-4 py-3 font-semibold">TRANSACTION ID</th>
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
                  <td className="px-4 py-3">{formatDate(dateOf(o))}<br /><span className="font-semibold">{formatINR(amountOf(o))}</span></td>
                  <td className="max-w-48 truncate px-4 py-3">{itemsOf(o)}</td>
                  <td className="px-4 py-3 text-slate-500">—</td>
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
    </div>
  );
}
