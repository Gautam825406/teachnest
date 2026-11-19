"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, asList, scoreSheetApi, type AnyRecord, type ScoreRow, type TestSeries } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select } from "@/components/ui";

export default function ScoreSheetPage() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [seriesList, setSeriesList] = useState<TestSeries[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [chapterTest, setChapterTest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [students, setStudents] = useState<AnyRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [score, setScore] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<unknown>("/test-series?per_page=100").then((d) => {
      const { items } = asList(d as never);
      setSeriesList(items as TestSeries[]);
    }).catch(() => undefined);
    apiFetch<unknown>("/students?per_page=100").then((d) => {
      const { items } = asList(d as never);
      setStudents(items as AnyRecord[]);
    }).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scoreSheetApi.get(seriesId || undefined, chapterTest || undefined);
      setRows(data.students || []);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the score sheet.");
    } finally { setLoading(false); }
  }, [seriesId, chapterTest]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await scoreSheetApi.save({
        student_id: Number(studentId) || studentId,
        test_series_id: Number(seriesId) || seriesId,
        chapter_test: chapterTest || undefined,
        score: Number(score),
        total_marks: Number(totalMarks),
      });
      setModalOpen(false);
      setScore("");
      setTotalMarks("");
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the score.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <BannerHeader
        title="Score Sheet"
        subtitle="View student scores for a test series and chapter test, and add scores manually."
        actions={
          <>
            <Button variant="secondary" onClick={load}>Refresh</Button>
            <Button onClick={() => { setFormError(null); setModalOpen(true); }} disabled={!seriesId}>+ Add Score</Button>
          </>
        }
      />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className="max-w-xs">
            <option value="">Select test series</option>
            {seriesList.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>{s.title}</option>
            ))}
          </Select>
          <Input placeholder="Chapter / Test (optional)" value={chapterTest} onChange={(e) => setChapterTest(e.target.value)} className="max-w-xs" />
          <Button onClick={load} disabled={!seriesId}>View Score Sheet</Button>
        </div>
      </Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {rows.length}</Badge>
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : !loaded ? (
        <EmptyState title="Select a test series" subtitle="Choose a test series above to view its score sheet." />
      ) : rows.length === 0 ? (
        <EmptyState title="No scores yet" subtitle="No scores have been recorded for this test series yet." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">STUDENT</th>
                <th className="px-4 py-3 font-semibold">SCORE</th>
                <th className="px-4 py-3 font-semibold">TOTAL MARKS</th>
                <th className="px-4 py-3 font-semibold">PERCENTAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((r) => {
                const pct = r.total_marks ? Math.round((Number(r.score || 0) / Number(r.total_marks)) * 100) : null;
                return (
                  <tr key={String(r.student_id)}>
                    <td className="px-4 py-3 font-medium">{String(r.student_name || r.student_id)}</td>
                    <td className="px-4 py-3">{r.score ?? "—"}</td>
                    <td className="px-4 py-3">{r.total_marks ?? "—"}</td>
                    <td className="px-4 py-3">{pct === null ? "—" : `${pct}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} title="Add Score" onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student" required>
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>{String(s.name || s.full_name || s.id)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Chapter / Test"><Input value={chapterTest} onChange={(e) => setChapterTest(e.target.value)} placeholder="e.g. Chapter 5 Test" /></Field>
            <Field label="Score" required><Input type="number" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} required placeholder="e.g. 42" /></Field>
            <Field label="Total Marks" required><Input type="number" step="0.5" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} required placeholder="e.g. 50" /></Field>
          </div>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save Score"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
