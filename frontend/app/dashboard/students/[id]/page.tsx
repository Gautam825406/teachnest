"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, formatDate, type Student } from "@/lib/api";
import { Button, Card, ErrorBox, Loading, PageHeader } from "@/components/ui";

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Student>(`/students/${params.id}`)
      .then(setStudent)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the student."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <Loading />;
  if (error || !student) return <ErrorBox message={error || "Student not found."} />;

  const name = String(student.name || student.full_name || "Student");
  const entries = Object.entries(student).filter(([k]) => !["id"].includes(k));

  return (
    <div>
      <PageHeader title={name} subtitle={`Student ID: ${String(student.id)}`} actions={<Link href="/dashboard/students"><Button variant="secondary">Back to Students</Button></Link>} />
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">{name.trim().charAt(0).toUpperCase()}</div>
          <div>
            <p className="text-lg font-bold">{name}</p>
            <p className="text-sm text-slate-500">{String(student.masked_phone || student.phone || "")}</p>
            <p className="text-sm text-slate-500">{String(student.email || "")}</p>
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replace(/_/g, " ")}</dt>
              <dd className="mt-1 break-words text-sm">
                {typeof value === "string" && (key.includes("date") || key.includes("created") || key.includes("updated")) ? formatDate(value) : Array.isArray(value) ? value.join(", ") : value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
