"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, formatDate, type Paged, type Student } from "@/lib/api";
import { BannerHeader, Badge, Button, Card, EmptyState, ErrorBox, Input, Loading } from "@/components/ui";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), per_page: "18" });
      if (search) q.set("search", search);
      if (phone) q.set("phone", phone);
      if (email) q.set("email", email);
      if (city) q.set("city", city);
      if (state) q.set("state", state);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const data = await apiFetch<Paged<Student> | Student[]>(`/students?${q.toString()}`);
      if (Array.isArray(data)) { setStudents(data); setTotal(data.length); }
      else { setStudents(data.items || []); setTotal(data.total ?? (data.items || []).length); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load students."); }
    finally { setLoading(false); }
  }, [search, phone, email, city, state, from, to, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 18));
  const nameOf = (s: Student) => String(s.name || s.full_name || "Student");
  const initial = (s: Student) => nameOf(s).trim().charAt(0).toUpperCase() || "?";

  return (
    <div>
      <BannerHeader title="Students" subtitle="Student Directory — search by name, phone, email, date, city or state." actions={<Button variant="secondary" onClick={load}>Refresh</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {total}</Badge>
      </div>
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Search by Name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Input placeholder="Search by Phone" value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} />
          <Input placeholder="Search by Email" value={email} onChange={(e) => { setEmail(e.target.value); setPage(1); }} />
          <Input placeholder="City" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} />
          <Input placeholder="State" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }} />
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
          <Button variant="secondary" onClick={() => { setSearch(""); setPhone(""); setEmail(""); setCity(""); setState(""); setFrom(""); setTo(""); setPage(1); }}>Reset Filters</Button>
        </div>
      </Card>
      <ErrorBox message={error} />
      {loading ? <Loading /> : students.length === 0 ? (
        <EmptyState title="No students found" subtitle="Try widening your search filters." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <Card key={String(s.id)} className="flex items-start gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">{initial(s)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{nameOf(s)}</p>
                  <p className="text-sm text-slate-500">{String(s.masked_phone || s.phone || "—")}</p>
                  <p className="text-xs text-slate-500">Joined: {formatDate(String(s.signup_date || s.created_at || ""))}</p>
                  <Link href={`/dashboard/students/${s.id}`} className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">View →</Link>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}
