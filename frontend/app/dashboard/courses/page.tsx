"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, formatINR, type Course, type Paged } from "@/lib/api";
import { BannerHeader, Badge, Button, Card, EmptyState, ErrorBox, Input, Loading, Select } from "@/components/ui";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Paged<Course> | Course[]>(
        `/courses?search=${encodeURIComponent(search)}&page=${page}&per_page=${perPage}`
      );
      if (Array.isArray(data)) { setCourses(data); setTotal(data.length); }
      else { setCourses(data.items || []); setTotal(data.total ?? (data.items || []).length); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load courses.");
    } finally { setLoading(false); }
  }, [search, page, perPage]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string | number) {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    setDeleting(String(id));
    try {
      await apiFetch(`/courses/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete the course."); }
    finally { setDeleting(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <BannerHeader
        title="Courses"
        subtitle="Manage all courses for your institute."
        actions={
          <>
            <Button variant="secondary" onClick={load}>Refresh</Button>
            <Link href="/dashboard/courses/new"><Button>Add Course</Button></Link>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {total}</Badge>
        <Input placeholder="Search courses..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <label className="ml-auto flex items-center gap-2 text-sm">
          Per page
          <Select value={String(perPage)} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="w-20">
            <option value="9">9</option><option value="12">12</option><option value="18">18</option><option value="36">36</option>
          </Select>
        </label>
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : courses.length === 0 ? (
        <EmptyState title="No courses yet" subtitle="Create your first course to start selling to students." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Card key={String(c.id)} className="overflow-hidden">
                <div className="flex h-36 items-center justify-center bg-brand-700 text-sm font-medium text-white">
                  {c.thumbnail_url ? c.thumbnail_url : "Course Thumbnail"}
                </div>
                <div className="p-4">
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="mt-1 text-xs text-stone-500">ID: {String(c.id)}</p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Validity: {c.validity_days ? `${c.validity_days} Days` : "—"}</p>
                  <p className="mt-1 text-lg font-bold">{formatINR(c.price)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" className="flex-1">Buy Now</Button>
                    <Button variant="secondary" onClick={() => router.push(`/dashboard/courses/${c.id}/edit`)}>Edit</Button>
                    <Button variant="danger" onClick={() => remove(c.id)} disabled={deleting === String(c.id)}>Delete</Button>
                  </div>
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
