"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, subjectsApi, type Course, type Subject } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select, Textarea } from "@/components/ui";

export default function SubjectsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const loadSubjects = useCallback(async (id: string) => {
    if (!id) { setSubjects([]); return; }
    setListLoading(true);
    setError(null);
    try {
      const data = await subjectsApi.list(id);
      const { items } = asList(data);
      setSubjects([...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subjects.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadSubjects(courseId); }, [courseId, loadSubjects]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setOrder(String(subjects.length + 1));
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || "");
    setOrder(s.order !== undefined && s.order !== null ? String(s.order) : "");
    setFormError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    setBusy(true);
    setFormError(null);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      order: order === "" ? undefined : Number(order),
    };
    try {
      if (editing) await subjectsApi.update(editing.id, body);
      else await subjectsApi.create(courseId, body);
      setModalOpen(false);
      loadSubjects(courseId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the subject.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Subject) {
    if (!confirm(`Delete subject "${s.name}"? This cannot be undone.`)) return;
    setDeleting(String(s.id));
    try {
      await subjectsApi.remove(s.id);
      loadSubjects(courseId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the subject.");
    } finally {
      setDeleting(null);
    }
  }

  const selectedCourse = courses.find((c) => String(c.id) === courseId);

  return (
    <div>
      <BannerHeader
        title="Add Subject"
        subtitle="Organise a course into subjects."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadSubjects(courseId)}>Refresh</Button>
            <Button onClick={openCreate} disabled={!courseId}>+ Add Subject</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>{c.title}</option>
            ))}
          </Select>
        </div>
        {selectedCourse && <Badge tone="indigo">TOTAL {subjects.length}</Badge>}
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : !courseId ? (
        <EmptyState title="Select a course" subtitle="Pick a course above to see and manage its subjects." />
      ) : listLoading ? (
        <Loading />
      ) : subjects.length === 0 ? (
        <EmptyState title="No subjects yet" subtitle={`Create the first subject for "${selectedCourse?.title}".`} />
      ) : (
        <Card className="divide-y divide-stone-200 dark:divide-stone-800">
          {subjects.map((s) => (
            <div key={String(s.id)} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">
                  {s.order !== undefined && s.order !== null && <span className="mr-2 text-stone-400">#{s.order}</span>}
                  {s.name}
                </p>
                <p className="text-xs text-stone-500">
                  ID: {String(s.id)}
                  {s.description ? ` • ${s.description}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(s)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(s)} disabled={deleting === String(s.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Subject" : "Add Subject"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Subject Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Algebra" />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this subject cover?" />
          </Field>
          <Field label="Order" hint="Subjects are listed in this order, lowest first.">
            <Input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1" />
          </Field>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Update Subject" : "Add Subject"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
