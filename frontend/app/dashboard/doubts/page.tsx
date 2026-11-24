"use client";
import { useCallback, useEffect, useState } from "react";
import { asList, doubtsApi, type Doubt } from "@/lib/api";
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader, Textarea } from "@/components/ui";

const FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Waiting" },
  { value: "ai_answered", label: "AI Answered" },
  { value: "answered", label: "Teacher Answered" },
] as const;

function statusBadge(d: Doubt) {
  if (d.status === "answered") return <Badge tone="green">Teacher Answered</Badge>;
  if (d.status === "ai_answered") return <Badge tone="indigo">AI Answered</Badge>;
  return <Badge tone="amber">Waiting for teacher</Badge>;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DoubtsPage() {
  const [filter, setFilter] = useState<string>("");
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoubts(asList(await doubtsApi.list(filter || undefined)).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load doubts.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReply = async (d: Doubt) => {
    const text = (replyText[d.id] ?? "").trim();
    if (!text) {
      setSendError("Write a reply first.");
      return;
    }
    setSendError(null);
    setSendingId(d.id);
    try {
      const updated = await doubtsApi.reply(d.id, text);
      setDoubts((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      setReplyText((prev) => ({ ...prev, [d.id]: "" }));
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Could not send the reply.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Student Doubts"
        subtitle="Questions students asked in the app. AI answers instantly when a Groq or Gemini key is set up; reply here as the teacher."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.value} variant={filter === f.value ? "primary" : "secondary"} onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <Loading label="Loading doubts…" />
      ) : error ? (
        <ErrorBox message={error} />
      ) : doubts.length === 0 ? (
        <EmptyState title="No doubts yet" subtitle="When a student asks a question in the app, it will appear here." />
      ) : (
        <div className="space-y-4">
          {doubts.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="indigo">{d.subject}</Badge>
                {statusBadge(d)}
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {d.student_name || "Student"} · {formatDate(d.created_at)}
                </span>
                {d.topic ? <span className="text-sm text-stone-500 dark:text-stone-400">Topic: {d.topic}</span> : null}
              </div>
              <p className="mt-3 font-semibold text-stone-900 dark:text-stone-100">{d.question}</p>
              {d.ai_answer ? (
                <div className="mt-3 rounded-[10px] border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                    AI answer {d.ai_provider ? `(${d.ai_provider})` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-200">{d.ai_answer}</p>
                  <p className="mt-1 text-xs text-stone-500">AI answer — students are told to verify it with a teacher.</p>
                </div>
              ) : null}
              {d.teacher_reply ? (
                <div className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Teacher&apos;s reply{d.teacher_name ? ` — ${d.teacher_name}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-200">{d.teacher_reply}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <Textarea
                    rows={3}
                    placeholder="Write your reply as the teacher…"
                    value={replyText[d.id] ?? ""}
                    onChange={(e) => setReplyText((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  />
                  <div className="mt-2">
                    <Button variant="primary" disabled={sendingId === d.id} onClick={() => void sendReply(d)}>
                      {sendingId === d.id ? "Sending…" : "Send Reply"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {sendError ? (
        <div className="mt-4">
          <ErrorBox message={sendError} />
        </div>
      ) : null}
    </div>
  );
}
