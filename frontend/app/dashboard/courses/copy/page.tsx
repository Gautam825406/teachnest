"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, asList, copyCourseApi, formatINR, type Course } from "@/lib/api";
import { BannerHeader, Button, Card, ErrorBox, Field, Input, Loading, Select } from "@/components/ui";

export default function CopyCoursePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [newName, setNewName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<Course | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<unknown>("/courses?per_page=100");
        const { items } = asList(data as never);
        setCourses(items as Course[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load courses.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function pickSource(id: string) {
    setSourceId(id);
    setCopied(null);
    setError(null);
    const course = courses.find((c) => String(c.id) === id);
    setNewName(course ? `${course.title} (Copy)` : "");
    setPrice("");
  }

  async function copy(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId) return;
    setBusy(true);
    setError(null);
    setCopied(null);
    const body: { new_name?: string; price?: number } = {};
    if (newName.trim()) body.new_name = newName.trim();
    if (price !== "") body.price = Number(price);
    try {
      const created = await copyCourseApi.copy(sourceId, body);
      setCopied(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not copy the course.");
    } finally {
      setBusy(false);
    }
  }

  const source = courses.find((c) => String(c.id) === sourceId);

  return (
    <div>
      <BannerHeader
        title="Copy Course"
        subtitle="Duplicate an existing course, optionally with a new name and price."
      />
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : (
        <Card className="max-w-2xl p-6">
          <form onSubmit={copy} className="space-y-4">
            <Field label="Source Course" required>
              <Select value={sourceId} onChange={(e) => pickSource(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{c.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="New Course Name" required hint="Prefilled from the source course — edit it if you like.">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. Class 10 Science (Copy)" disabled={!sourceId} />
            </Field>
            <Field label="Price Override (Rs.)" hint="Leave blank to keep the source course price.">
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={source?.price !== undefined && source?.price !== null ? String(source.price) : "Same as source"} disabled={!sourceId} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy || !sourceId}>{busy ? "Copying..." : "Copy Course"}</Button>
            </div>
          </form>
        </Card>
      )}

      {copied && (
        <Card className="mt-6 max-w-2xl border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">Course copied successfully</p>
          <p className="mt-2 text-sm">
            <span className="font-medium">{copied.title}</span>
            {" • "}ID: {String(copied.id)}
            {copied.price !== undefined && copied.price !== null && ` • Price: ${formatINR(copied.price)}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/courses"><Button>View All Courses</Button></Link>
            <Link href={`/dashboard/courses/${copied.id}/edit`}><Button variant="secondary">Edit Copied Course</Button></Link>
          </div>
        </Card>
      )}
    </div>
  );
}
