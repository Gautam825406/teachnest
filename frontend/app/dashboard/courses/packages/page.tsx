"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, coursePackagesApi, formatINR, type Course, type CoursePackage } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Textarea } from "@/components/ui";

export default function PackagesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CoursePackage | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, crs] = await Promise.all([
        coursePackagesApi.list(),
        apiFetch<unknown>("/courses?per_page=100"),
      ]);
      const { items } = asList(pkgs);
      setPackages(items);
      const { items: courseItems } = asList(crs as never);
      setCourses(courseItems as Course[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load packages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courseTitle = (id: number | string) =>
    courses.find((c) => String(c.id) === String(id))?.title || String(id);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setCourseIds([]);
    setPrice("");
    setMrp("");
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(p: CoursePackage) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || "");
    setCourseIds((p.course_ids || []).map(String));
    setPrice(p.price !== undefined && p.price !== null ? String(p.price) : "");
    setMrp(p.mrp !== undefined && p.mrp !== null ? String(p.mrp) : "");
    setIsActive(p.is_active !== false);
    setFormError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      course_ids: courseIds.map((x) => Number(x) || x),
      price: price === "" ? undefined : Number(price),
      mrp: mrp === "" ? undefined : Number(mrp),
      is_active: isActive,
    };
    try {
      if (editing) await coursePackagesApi.update(editing.id, body);
      else await coursePackagesApi.create(body);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the package.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: CoursePackage) {
    if (!confirm(`Delete package "${p.name}"? This cannot be undone.`)) return;
    setDeleting(String(p.id));
    try {
      await coursePackagesApi.remove(p.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the package.");
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(p: CoursePackage) {
    const next = p.is_active === false ? true : false;
    setToggling(String(p.id));
    try {
      await coursePackagesApi.update(p.id, { is_active: next });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the package.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <BannerHeader
        title="Packages"
        subtitle="Bundle multiple courses into one package at a combined price."
        actions={
          <>
            <Button variant="secondary" onClick={load}>Refresh</Button>
            <Button onClick={openCreate}>+ Add Package</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {packages.length}</Badge>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : packages.length === 0 ? (
        <EmptyState title="No packages yet" subtitle="Create your first course package to sell bundled courses." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">PACKAGE</th>
                <th className="px-4 py-3 font-semibold">COURSES</th>
                <th className="px-4 py-3 font-semibold">PRICE</th>
                <th className="px-4 py-3 font-semibold">MRP</th>
                <th className="px-4 py-3 font-semibold">STATUS</th>
                <th className="px-4 py-3 font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {packages.map((p) => (
                <tr key={String(p.id)}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.description && <p className="max-w-64 truncate text-xs text-slate-500">{p.description}</p>}
                  </td>
                  <td className="max-w-64 px-4 py-3">
                    {(p.course_ids || []).length === 0 ? "—" : (p.course_ids || []).map(courseTitle).join(", ")}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatINR(p.price)}</td>
                  <td className="px-4 py-3">{p.mrp !== undefined && p.mrp !== null ? formatINR(p.mrp) : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.is_active === false ? "slate" : "green"}>{p.is_active === false ? "Inactive" : "Active"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => toggleActive(p)} disabled={toggling === String(p.id)}>
                        {p.is_active === false ? "Activate" : "Deactivate"}
                      </Button>
                      <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => remove(p)} disabled={deleting === String(p.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Package" : "Add Package"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Package Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Class 10 Complete Bundle" />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this package include?" />
          </Field>
          <Field label="Courses" required hint="Select the courses included in this package.">
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-3 dark:border-slate-700">
              {courses.length === 0 && <p className="text-sm text-slate-500">No courses available yet.</p>}
              {courses.map((c) => (
                <label key={String(c.id)} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={courseIds.includes(String(c.id))}
                    onChange={() => {
                      const id = String(c.id);
                      setCourseIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
                    }}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {c.title}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (Rs.)" required>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0" />
            </Field>
            <Field label="MRP (Rs.)">
              <Input type="number" min="0" value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            Active (students can buy this package)
          </label>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Update Package" : "Add Package"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
