"use client";
import { useEffect, useState } from "react";
import CrudPage from "@/components/CrudPage";
import { liveConfigApi, type LiveConfig } from "@/lib/api";
import { Badge, Card } from "@/components/ui";

function LiveConfigBanner() {
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    liveConfigApi
      .get()
      .then(setConfig)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <Card className="mb-4 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Live-class status is unavailable right now — the backend live-config endpoint did not respond. Seminars below
          are scheduled with a meeting link; treat them as demo until live classes are confirmed configured.
        </p>
      </Card>
    );
  }
  if (!config) return null;

  const configured = config.configured === true;
  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold">Live classes</p>
        <Badge tone={configured ? "green" : "slate"}>
          {configured ? `LIVE — ${config.provider || "provider"}` : "DEMO"}
        </Badge>
        <p className="text-sm text-slate-500">
          {configured
            ? `Live classes are hosted on ${config.provider || "the configured provider"}.`
            : `Live classes are not configured yet (provider: ${config.provider || "100ms / Agora"}). Seminars are demo-only until a live provider is configured — no real class is live.`}
        </p>
      </div>
    </Card>
  );
}

export default function Page() {
  return (
    <div>
      <LiveConfigBanner />
      <CrudPage
        title="Seminars"
        subtitle="Schedule live seminars and share the meeting link with students."
        endpoint="/seminars"
        itemLabel="Seminar"
        searchPlaceholder="Search seminars..."
        fields={[
          { key: "title", label: "Title", required: true, placeholder: "e.g. Career Guidance Seminar" },
          { key: "category", label: "Category", placeholder: "e.g. Guidance" },
          { key: "scheduled_at", label: "Scheduled At", type: "datetime" },
          { key: "meeting_url", label: "Meeting URL", type: "url", placeholder: "https://..." },
          { key: "description", label: "Description", type: "textarea", placeholder: "What will this seminar cover?" },
        ]}
        columns={[
          { key: "title", label: "TITLE" },
          { key: "category", label: "CATEGORY" },
          { key: "scheduled_at", label: "SCHEDULED AT", format: "date" },
          { key: "meeting_url", label: "MEETING", format: "link" },
        ]}
      />
    </div>
  );
}
