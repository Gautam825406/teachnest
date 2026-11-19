"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, asList, formatDate, videoSubmissionsApi, type AnyRecord, type VideoAssignment, type VideoSubmission } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select, Textarea } from "@/components/ui";

export default function VideoSubmissionsPage() {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VideoSubmission | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("reviewed");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await videoSubmissionsApi.list(assignmentId || undefined);
      const { items } = asList(data as never);
      setSubmissions(items as VideoSubmission[]);
      const a = await apiFetch<unknown>("/video-assignments?per_page=100");
      const { items: alist } = asList(a as never);
      setAssignments(alist as VideoAssignment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load submissions.");
    } finally { setLoading(false); }
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  function openGrade(s: VideoSubmission) {
    setEditing(s);
    setMarks(String(s.marks ?? ""));
    setFeedback(String(s.feedback ?? ""));
    setStatus(String(s.status || "reviewed"));
    setFormError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await videoSubmissionsApi.update(editing.id, {
        marks: marks === "" ? undefined : Number(marks),
        feedback: feedback || undefined,
        status,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the grading.");
    } finally { setBusy(false); }
  }

  const nameOf = (s: VideoSubmission) => String((s as AnyRecord).student_name || (s as AnyRecord).student || s.student_id || "—");

  return (
    <div>
      <BannerHeader
        title="Video Assignment Submissions"
        subtitle="Review student submissions and award marks."
        actions={
          <>
            <Link href="/dashboard/video-assignments"><Button variant="secondary">Back to Video Assignments</Button></Link>
            <Button variant="secondary" onClick={load}>Refresh</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {submissions.length}</Badge>
        <Select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="max-w-xs">
          <option value="">All assignments</option>
          {assignments.map((a) => (
            <option key={String(a.id)} value={String(a.id)}>{a.title}</option>
          ))}
        </Select>
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : submissions.length === 0 ? (
        <EmptyState title="No submissions yet" subtitle="Submissions will appear here once students submit their work." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">STUDENT</th>
                <th className="px-4 py-3 font-semibold">ASSIGNMENT</th>
                <th className="px-4 py-3 font-semibold">MARKS</th>
                <th className="px-4 py-3 font-semibold">STATUS</th>
                <th className="px-4 py-3 font-semibold">FEEDBACK</th>
                <th className="px-4 py-3 font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {submissions.map((s) => (
                <tr key={String(s.id)}>
                  <td className="px-4 py-3 font-medium">{nameOf(s)}</td>
                  <td className="px-4 py-3">{String((s as AnyRecord).assignment_title || s.assignment_id || "—")}</td>
                  <td className="px-4 py-3">{s.marks ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={String(s.status).toUpperCase() === "REVIEWED" ? "green" : String(s.status).toUpperCase() === "PENDING" ? "amber" : "slate"}>{String(s.status || "—")}</Badge></td>
                  <td className="max-w-64 truncate px-4 py-3">{String(s.feedback || "—")}</td>
                  <td className="px-4 py-3"><Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => openGrade(s)}>Grade</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} title="Grade Submission" onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marks"><Input type="number" step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="e.g. 8" /></Field>
            <Field label="Status" required>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="reviewed">Reviewed</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Feedback"><Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback for the student..." /></Field></div>
          </div>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save Grading"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
