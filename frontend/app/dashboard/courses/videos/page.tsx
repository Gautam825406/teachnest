"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, courseVideosApi, formatDuration, subjectsApi, topicsApi, type Course, type CourseVideo, type Subject, type Topic } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select } from "@/components/ui";

export default function CourseVideosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseVideo | null>(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [order, setOrder] = useState("");
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTopicId, setFormTopicId] = useState("");
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
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
    if (!id) { setTopics([]); return []; }
    try {
      const data = await topicsApi.list(id);
      const { items } = asList(data);
      const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTopics(sorted);
      return sorted;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load topics.");
      return [];
    }
  }, []);

  const loadVideos = useCallback(async (id: string, sid: string, tid: string) => {
    if (!id) { setVideos([]); return; }
    setListLoading(true);
    setError(null);
    try {
      const data = await courseVideosApi.list(id, sid || undefined, tid || undefined);
      const { items } = asList(data);
      setVideos([...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load videos.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    setSubjectId("");
    setTopicId("");
    setTopics([]);
    setVideos([]);
    loadSubjects(courseId);
  }, [courseId, loadSubjects]);

  useEffect(() => {
    setTopicId("");
    setTopics([]);
    loadTopics(subjectId);
  }, [subjectId, loadTopics]);

  useEffect(() => { loadVideos(courseId, subjectId, topicId); }, [courseId, subjectId, topicId, loadVideos]);

  // Topics for the modal's subject picker.
  useEffect(() => {
    if (!formSubjectId) { setFormTopics([]); setFormTopicId(""); return; }
    topicsApi.list(formSubjectId)
      .then((data) => {
        const { items } = asList(data);
        setFormTopics([...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      })
      .catch(() => setFormTopics([]));
  }, [formSubjectId]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setVideoUrl("");
    setDuration("");
    setOrder(String(videos.length + 1));
    setIsFreePreview(false);
    setFormSubjectId(subjectId);
    setFormTopicId(topicId);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(v: CourseVideo) {
    setEditing(v);
    setTitle(v.title);
    setVideoUrl(v.video_url);
    setDuration(v.duration_seconds !== undefined && v.duration_seconds !== null ? String(v.duration_seconds) : "");
    setOrder(v.order !== undefined && v.order !== null ? String(v.order) : "");
    setIsFreePreview(!!v.is_free_preview);
    const sid = v.subject_id ? String(v.subject_id) : "";
    setFormSubjectId(sid);
    setFormTopicId(v.topic_id ? String(v.topic_id) : "");
    setFormError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    setBusy(true);
    setFormError(null);
    const body = {
      subject_id: formSubjectId ? Number(formSubjectId) || formSubjectId : null,
      topic_id: formTopicId ? Number(formTopicId) || formTopicId : null,
      title: title.trim(),
      video_url: videoUrl.trim(),
      duration_seconds: duration === "" ? undefined : Number(duration),
      order: order === "" ? undefined : Number(order),
      is_free_preview: isFreePreview,
    };
    try {
      if (editing) await courseVideosApi.update(editing.id, body);
      else await courseVideosApi.create(courseId, body);
      setModalOpen(false);
      loadVideos(courseId, subjectId, topicId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the video.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: CourseVideo) {
    if (!confirm(`Delete video "${v.title}"? This cannot be undone.`)) return;
    setDeleting(String(v.id));
    try {
      await courseVideosApi.remove(v.id);
      loadVideos(courseId, subjectId, topicId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the video.");
    } finally {
      setDeleting(null);
    }
  }

  const subjectName = (id?: number | string | null) =>
    id ? subjects.find((s) => String(s.id) === String(id))?.name || String(id) : "—";
  const topicName = (id?: number | string | null) =>
    id ? topics.find((t) => String(t.id) === String(id))?.name || String(id) : "—";

  return (
    <div>
      <BannerHeader
        title="Add Videos"
        subtitle="Course videos for students — separate from Video Assignments and YouTube Playlists."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadVideos(courseId, subjectId, topicId)}>Refresh</Button>
            <Button onClick={openCreate} disabled={!courseId}>+ Add Video</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>{c.title}</option>
            ))}
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!courseId}>
            <option value="">No subject (all)</option>
            {subjects.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <Select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subjectId}>
            <option value="">No topic (all)</option>
            {topics.map((t) => (
              <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
            ))}
          </Select>
        </div>
        {courseId && <Badge tone="indigo">TOTAL {videos.length}</Badge>}
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : !courseId ? (
        <EmptyState title="Select a course" subtitle="Pick a course above to see and manage its videos. Subject and topic filters are optional." />
      ) : listLoading ? (
        <Loading />
      ) : videos.length === 0 ? (
        <EmptyState title="No videos yet" subtitle="Add the first video for this course." />
      ) : (
        <Card className="divide-y divide-slate-200 dark:divide-slate-800">
          {videos.map((v) => (
            <div key={String(v.id)} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {v.order !== undefined && v.order !== null && <span className="mr-2 text-slate-400">#{v.order}</span>}
                  {v.title}
                  {v.is_free_preview && <Badge tone="green" >Free Preview</Badge>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  Duration: {formatDuration(v.duration_seconds)} • Subject: {subjectName(v.subject_id)} • Topic: {topicName(v.topic_id)}
                </p>
                <p className="truncate text-xs text-slate-500">{v.video_url}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => openEdit(v)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(v)} disabled={deleting === String(v.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Video" : "Add Video"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Introduction to Algebra" />
          </Field>
          <Field label="Video URL" required hint="A YouTube link or an uploaded file URL works.">
            <Input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://www.youtube.com/watch?v=..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration (seconds)">
              <Input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="600" />
            </Field>
            <Field label="Order" hint="Videos are listed in this order, lowest first.">
              <Input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={formSubjectId} onChange={(e) => { setFormSubjectId(e.target.value); setFormTopicId(""); }}>
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Topic">
              <Select value={formTopicId} onChange={(e) => setFormTopicId(e.target.value)} disabled={!formSubjectId}>
                <option value="">No topic</option>
                {formTopics.map((t) => (
                  <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFreePreview} onChange={(e) => setIsFreePreview(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            Free preview (students can watch this video without enrolling)
          </label>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Update Video" : "Add Video"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
