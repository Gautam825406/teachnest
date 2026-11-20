"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { aiGeneratorApi, asList, integrationsStatusApi, testSeriesApi, type AiDraftQuestion, type AiGeneration, type TestSeries } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Select, Textarea } from "@/components/ui";

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];
const QUESTION_TYPES = [
  { value: "mcq", label: "MCQ (4 options)" },
  { value: "short", label: "Short answer" },
];
const ACCEPTED = ".pdf,.txt,.xlsx,.csv,.docx,.png,.jpg,.jpeg,.webp";

interface EditableQuestion extends AiDraftQuestion {
  key: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  answer: string;
  marks: number;
  negative_marks: number;
}

function toEditable(q: AiDraftQuestion, i: number): EditableQuestion {
  const opts = Array.isArray(q.options) ? q.options : [q.option_a, q.option_b, q.option_c, q.option_d];
  return {
    key: `q-${Date.now()}-${i}`,
    question_text: String(q.question || q.question_text || ""),
    option_a: String(opts[0] || ""),
    option_b: String(opts[1] || ""),
    option_c: String(opts[2] || ""),
    option_d: String(opts[3] || ""),
    correct_option: (q.correct_option || "A").toUpperCase(),
    answer: String(q.answer || ""),
    marks: q.marks ?? 1,
    negative_marks: q.negative_marks ?? 0,
    topic: q.topic,
  };
}

/** Convert an edited draft back to the backend's question shape. */
function toBackendQuestion(d: EditableQuestion): AiDraftQuestion {
  return {
    question: d.question_text,
    options: [d.option_a, d.option_b, d.option_c, d.option_d],
    correct_option: d.correct_option,
    answer: d.answer,
    marks: Number(d.marks) || 1,
    negative_marks: Number(d.negative_marks) || 0,
  };
}

export default function AiGeneratorPage() {
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [series, setSeries] = useState<TestSeries[]>([]);
  const [generations, setGenerations] = useState<AiGeneration[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [topic, setTopic] = useState("");
  const [className, setClassName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("10");
  const [questionType, setQuestionType] = useState("mcq");

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<EditableQuestion[]>([]);

  const [targetSeries, setTargetSeries] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatusLoading(true);
    try {
      const s = await integrationsStatusApi.get();
      setAiConfigured(s.groq?.configured === true);
    } catch {
      setAiConfigured(null);
    } finally { setStatusLoading(false); }
    try {
      const data = await testSeriesApi.list("?per_page=100");
      const { items } = asList(data as never);
      setSeries(items as TestSeries[]);
    } catch { /* test series list is optional here */ }
    try {
      const data = await aiGeneratorApi.generations();
      const { items } = asList(data as never);
      setGenerations(items as AiGeneration[]);
    } catch { /* past generations are optional */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenError(null);
    setSaveError(null);
    setSaveSuccess(null);
    if (!file && !pastedText.trim()) {
      setGenError("Upload a file (PDF, TXT, XLSX, CSV, DOCX or image) or paste source text.");
      return;
    }
    setGenerating(true);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      if (pastedText.trim()) form.append("text", pastedText.trim());
      form.append("topic", topic.trim());
      form.append("class_name", className.trim());
      form.append("difficulty", difficulty);
      form.append("count", count);
      form.append("question_types", questionType);
      const res = await aiGeneratorApi.generate(form);
      const id = String(res.generation_id ?? res.id ?? "");
      setGenerationId(id || null);
      const qs = res.questions || [];
      if (qs.length === 0) {
        setGenError("The AI returned no questions. Try different source material or a smaller count.");
      }
      setDrafts(qs.map(toEditable));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate questions.";
      setGenError(
        /groq|not configured|api key/i.test(msg)
          ? "AI not configured — set GROQ_API_KEY in Render, then try again."
          : msg
      );
    } finally { setGenerating(false); }
  }

  function updateDraft(key: string, patch: Partial<EditableQuestion>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  async function saveToSeries() {
    if (!generationId || !targetSeries) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const questions: AiDraftQuestion[] = drafts.map(toBackendQuestion);
      await aiGeneratorApi.save({
        generation_id: Number(generationId),
        test_series_id: Number(targetSeries),
        questions,
      });
      const target = series.find((s) => String(s.id) === targetSeries);
      setSaveSuccess(`${questions.length} question(s) saved to “${target?.title || targetSeries}”.`);
      setDrafts([]);
      setGenerationId(null);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the questions.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <BannerHeader
        title="AI Question Paper Generator"
        subtitle="Upload a file or paste text, and AI drafts questions you can edit before saving them to a test series."
        actions={
          <Link href="/dashboard/test-series"><Button variant="secondary">View Test Series</Button></Link>
        }
      />

      {statusLoading ? (
        <Loading label="Checking AI status..." />
      ) : aiConfigured === false ? (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-lg font-bold">AI not configured — set GROQ_API_KEY</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The AI Question Paper Generator needs a Groq API key. Set <code className="font-mono">GROQ_API_KEY</code> in
            the backend environment variables on Render and restart the backend. No questions are generated until then —
            nothing on this page is faked.
          </p>
          <div className="mt-4">
            <Link href="/dashboard/integrations"><Button variant="secondary">Check Integrations Status</Button></Link>
          </div>
        </Card>
      ) : aiConfigured === null ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Could not check the AI status (the backend integration-status endpoint did not respond). Generation may still
          work — try it, and the backend will report honestly if AI is not configured.
        </div>
      ) : null}

      <Card className="mb-6 p-5">
        <h2 className="text-lg font-bold">Generate questions</h2>
        <form onSubmit={generate} className="mt-4 space-y-4">
          <Field label="Source file" hint="PDF, TXT, XLSX, CSV, DOCX or image. The file is sent to the backend for AI generation; it is not stored in the browser.">
            <Input type="file" accept={ACCEPTED} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="mt-1 text-xs text-slate-500">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </Field>
          <Field label="Or paste source text">
            <Textarea rows={5} value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Paste the chapter or notes the questions should be based on..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Topic" required>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} required placeholder="e.g. Quadratic Equations" />
            </Field>
            <Field label="Class" required>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} required placeholder="e.g. Class 10" />
            </Field>
            <Field label="Difficulty" required>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required>
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Number of questions" required>
              <Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} required />
            </Field>
            <Field label="Question type" required>
              <Select value={questionType} onChange={(e) => setQuestionType(e.target.value)} required>
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
          </div>
          <ErrorBox message={genError} />
          <Button type="submit" disabled={generating || aiConfigured === false}>
            {generating ? "Generating..." : "Generate Draft Questions"}
          </Button>
        </form>
      </Card>

      {drafts.length > 0 && (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Draft questions — review and edit</h2>
              <p className="mt-1 text-sm text-slate-500">
                {drafts.length} draft question(s){generationId ? ` • Generation ${generationId}` : ""}. Edit anything
                before saving; drafts are not in any test series yet.
              </p>
            </div>
            <Badge tone="amber">DRAFT — NOT SAVED</Badge>
          </div>
          <div className="mt-4 space-y-5">
            {drafts.map((d, i) => (
              <div key={d.key} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">Q{i + 1}</p>
                  <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => removeDraft(d.key)}>Remove</Button>
                </div>
                <div className="mt-3 space-y-3">
                  <Field label="Question" required>
                    <Textarea rows={2} value={d.question_text} onChange={(e) => updateDraft(d.key, { question_text: e.target.value })} required />
                  </Field>
                  {questionType === "mcq" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(["A", "B", "C", "D"] as const).map((letter) => (
                        <Field key={letter} label={`Option ${letter}`} required>
                          <Input
                            value={String(d[`option_${letter.toLowerCase()}` as keyof EditableQuestion] ?? "")}
                            onChange={(e) => updateDraft(d.key, { [`option_${letter.toLowerCase()}`]: e.target.value } as Partial<EditableQuestion>)}
                          />
                        </Field>
                      ))}
                      <Field label="Correct option" required>
                        <Select value={d.correct_option} onChange={(e) => updateDraft(d.key, { correct_option: e.target.value })} required>
                          <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                        </Select>
                      </Field>
                    </div>
                  ) : (
                    <Field label="Model answer">
                      <Textarea rows={2} value={d.answer} onChange={(e) => updateDraft(d.key, { answer: e.target.value })} placeholder="Expected short answer..." />
                    </Field>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Marks">
                      <Input type="number" step="0.5" min={0} value={String(d.marks ?? 1)} onChange={(e) => updateDraft(d.key, { marks: Number(e.target.value) })} />
                    </Field>
                    <Field label="Negative marks">
                      <Input type="number" step="0.25" min={0} value={String(d.negative_marks ?? 0)} onChange={(e) => updateDraft(d.key, { negative_marks: Number(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Save to Test Series" required>
                <Select value={targetSeries} onChange={(e) => setTargetSeries(e.target.value)} required>
                  <option value="">Select a test series</option>
                  {series.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.title}</option>
                  ))}
                </Select>
              </Field>
              <Button onClick={saveToSeries} disabled={saving || !targetSeries || drafts.length === 0}>
                {saving ? "Saving..." : `Save ${drafts.length} Question(s)`}
              </Button>
            </div>
            {series.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                No test series yet — <Link href="/dashboard/test-series" className="font-semibold text-indigo-600 underline">create one first</Link>.
              </p>
            )}
            <ErrorBox message={saveError} />
            {saveSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                {saveSuccess}
              </div>
            )}
          </div>
        </Card>
      )}

      {generations.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-bold">Past generations</h2>
          <div className="mt-3 space-y-2">
            {generations.map((g) => (
              <div key={String(g.generation_id ?? g.id)} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-slate-800">
                <span className="font-medium">{g.topic || "Untitled generation"}</span>
                <span className="text-slate-500">
                  {g.class_name || ""} • {g.difficulty || ""} • {g.count ?? g.draft_json?.length ?? g.questions?.length ?? 0} question(s)
                  {g.status ? ` • ${g.status}` : ""}
                  {g.created_at ? ` • ${new Date(g.created_at).toLocaleString("en-IN")}` : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {generations.length === 0 && drafts.length === 0 && (
        <EmptyState title="No generations yet" subtitle="Generate your first draft questions from a file or pasted text above." />
      )}
    </div>
  );
}
