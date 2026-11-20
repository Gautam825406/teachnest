"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, subjectsApi, topicsApi, type Course, type Subject, type Topic } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select, Textarea } from "@/components/ui";

export default function TopicsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
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
    try {
      const data = await subjectsApi.list(id);
      const { items } = asList(data);
      setSubjects([...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subjects.");
    }
  }, []);

  const loadTopics = useCallback(async (id: string) => {
    if (!id) { setTopics([]); return; }
    setListLoading(true);
    setError(null);
    try {
      const data = await topicsApi.list(id);
      const { items } = asList(data);
      setTopics([...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load topics.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    setSubjectId("");
    setTopics([]);
    loadSubjects(courseId);
  }, [courseId, loadSubjects]);

  useEffect(() => { loadTopics(subjectId); }, [subjectId, loadTopics]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setOrder(String(topics.length + 1));
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(t: Topic) {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || "");
    setOrder(t.order !== undefined && t.order !== null ? String(t.order) : "");
    setFormError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) return;
    setBusy(true);
    setFormError(null);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      order: order === "" ? undefined : Number(order),
    };
    try {
      if (editing) await topicsApi.update(editing.id, body);
      else await topicsApi.create(subjectId, body);
      setModalOpen(false);
      loadTopics(subjectId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the topic.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Topic) {
    if (!confirm(`Delete topic "${t.name}"? This cannot be undone.`)) return;
    setDeleting(String(t.id));
    try {
      await topicsApi.remove(t.id);
      loadTopics(subjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the topic.");
    } finally {
      setDeleting(null);
    }
  }

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);

  return (
    <div>
      <BannerHeader
        title="Add Topic"
        subtitle="Organise a subject into topics."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadTopics(subjectId)}>Refresh</Button>
            <Button onClick={openCreate} disabled={!subjectId}>+ Add Topic</Button>
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
        <div className="w-full max-w-sm">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!courseId}>
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
            ))}
          </Select>
        </div>
        {selectedSubject && <Badge tone="indigo">TOTAL {topics.length}</Badge>}
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : !courseId ? (
        <EmptyState title="Select a course" subtitle="Pick a course, then a subject, to see and manage its topics." />
      ) : !subjectId ? (
        <EmptyState
          title="Select a subject"
          subtitle={subjects.length === 0 ? "This course has no subjects yet. Add one from the Add Subject page first." : "Pick a subject above to see and manage its topics."}
        />
      ) : listLoading ? (
        <Loading />
      ) : topics.length === 0 ? (
        <EmptyState title="No topics yet" subtitle={`Create the first topic for "${selectedSubject?.name}".`} />
      ) : (
        <Card className="divide-y divide-slate-200 dark:divide-slate-800">
          {topics.map((t) => (
            <div key={String(t.id)} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">
                  {t.order !== undefined && t.order !== null && <span className="mr-2 text-slate-400">#{t.order}</span>}
                  {t.name}
                </p>
                <p className="text-xs text-slate-500">
                  ID: {String(t.id)}
                  {t.description ? ` • ${t.description}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(t)} disabled={deleting === String(t.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Topic" : "Add Topic"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Topic Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Quadratic Equations" />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this topic cover?" />
          </Field>
          <Field label="Order" hint="Topics are listed in this order, lowest first.">
            <Input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1" />
          </Field>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Update Topic" : "Add Topic"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
