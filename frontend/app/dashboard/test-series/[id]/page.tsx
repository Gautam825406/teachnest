"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, asList, formatINR, testSeriesQuestionsApi, type AnyRecord, type TestQuestion, type TestSeries } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, Select, Textarea } from "@/components/ui";

const emptyQ = {
  chapter_test: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "",
  correct_option: "A", marks: "1", negative_marks: "0",
};

export default function TestSeriesDetailPage() {
  const params = useParams();
  const seriesId = String(params.id);
  const [series, setSeries] = useState<TestSeries | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyQ);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await apiFetch<TestSeries>(`/test-series/${seriesId}`);
      setSeries(s);
      const q = await testSeriesQuestionsApi.list(seriesId);
      const { items } = asList(q as never);
      setQuestions(items as TestQuestion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the test series.");
    } finally { setLoading(false); }
  }, [seriesId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await testSeriesQuestionsApi.create(seriesId, {
        chapter_test: form.chapter_test || undefined,
        question_text: form.question_text,
        option_a: form.option_a, option_b: form.option_b, option_c: form.option_c, option_d: form.option_d,
        correct_option: form.correct_option,
        marks: Number(form.marks), negative_marks: Number(form.negative_marks),
      });
      setModalOpen(false);
      setForm(emptyQ);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the question.");
    } finally { setBusy(false); }
  }

  async function remove(q: TestQuestion) {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setDeleting(String(q.id));
    try {
      await testSeriesQuestionsApi.remove(seriesId, q.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the question.");
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <BannerHeader
        title={series ? series.title : "Test Series"}
        subtitle={series ? `${series.description || ""} ${series.price !== undefined ? `• ${formatINR(series.price)}` : ""} ${series.validity_days ? `• ${series.validity_days} Days` : ""}`.trim() : "Manage questions for this test series."}
        actions={
          <>
            <Link href="/dashboard/test-series"><Button variant="secondary">Back to Test Series</Button></Link>
            <Button variant="secondary" onClick={load}>Refresh</Button>
            <Button onClick={() => { setForm(emptyQ); setFormError(null); setModalOpen(true); }}>+ Add Question</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="indigo">TOTAL {questions.length}</Badge>
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : questions.length === 0 ? (
        <EmptyState title="No questions yet" subtitle="Add your first question to this test series." />
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={String(q.id)} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Q{i + 1}. {q.question_text}</p>
                  {q.chapter_test && <p className="mt-1 text-xs text-stone-500">Chapter / Test: {q.chapter_test}</p>}
                  <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const val = q[`option_${letter.toLowerCase()}` as keyof TestQuestion];
                      const correct = String(q.correct_option || "").toUpperCase() === letter;
                      return (
                        <p key={letter} className={correct ? "font-semibold text-emerald-600" : "text-stone-600 dark:text-stone-300"}>
                          {letter}. {String(val ?? "—")} {correct && "(Correct)"}
                        </p>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Marks: {q.marks ?? 1} • Negative: {q.negative_marks ?? 0}</p>
                </div>
                <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => remove(q)} disabled={deleting === String(q.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Add Question" onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chapter / Test"><Input value={form.chapter_test} onChange={(e) => set("chapter_test", e.target.value)} placeholder="e.g. Chapter 5 Test" /></Field>
            <Field label="Correct Option" required>
              <Select value={form.correct_option} onChange={(e) => set("correct_option", e.target.value)} required>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Question" required><Textarea rows={3} value={form.question_text} onChange={(e) => set("question_text", e.target.value)} required placeholder="Write the question..." /></Field></div>
            <Field label="Option A" required><Input value={form.option_a} onChange={(e) => set("option_a", e.target.value)} required /></Field>
            <Field label="Option B" required><Input value={form.option_b} onChange={(e) => set("option_b", e.target.value)} required /></Field>
            <Field label="Option C" required><Input value={form.option_c} onChange={(e) => set("option_c", e.target.value)} required /></Field>
            <Field label="Option D" required><Input value={form.option_d} onChange={(e) => set("option_d", e.target.value)} required /></Field>
            <Field label="Marks" required><Input type="number" step="0.5" value={form.marks} onChange={(e) => set("marks", e.target.value)} required /></Field>
            <Field label="Negative Marks" required><Input type="number" step="0.25" value={form.negative_marks} onChange={(e) => set("negative_marks", e.target.value)} required /></Field>
          </div>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Add Question"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
