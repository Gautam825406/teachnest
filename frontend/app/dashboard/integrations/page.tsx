"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, integrationsApi, type Integration } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Loading } from "@/components/ui";

const FEATURED: { provider: string; name: string; description: string }[] = [
  {
    provider: "whatsapp",
    name: "WhatsApp API",
    description: "Send course updates, payment reminders and class links to students on WhatsApp.",
  },
  {
    provider: "teachnest-ai",
    name: "TeachNest AI",
    description: "AI-powered help for your institute: draft announcements, answer student questions and summarise content.",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await integrationsApi.list();
      setIntegrations(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load integrations.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setup(provider: string) {
    setBusy(provider);
    setNotice(null);
    try {
      await integrationsApi.setup(provider, {});
      setNotice(`${provider} setup started. Follow the instructions from the provider to finish connecting.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start setup for this integration.");
    } finally { setBusy(null); }
  }

  const byProvider = new Map(integrations.map((i) => [i.provider, i]));
  const others = integrations.filter((i) => !FEATURED.some((f) => f.provider === i.provider));

  return (
    <div>
      <BannerHeader
        title="Integrations"
        subtitle="Connect third-party services to extend TeachNest."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <ErrorBox message={error} />
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </div>
      )}
      {loading ? <Loading /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURED.map((f) => {
              const live = byProvider.get(f.provider);
              const status = String(live?.status || "INACTIVE").toUpperCase();
              const active = status === "ACTIVE";
              return (
                <Card key={f.provider} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{f.name}</h3>
                      <p className="mt-1">
                        <Badge tone="amber">BETA</Badge>{" "}
                        <Badge tone={active ? "green" : "slate"}>{status}</Badge>
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{live?.description || f.description}</p>
                  {live?.category && <p className="mt-2 text-xs text-slate-500">Category: {live.category}</p>}
                  <div className="mt-4">
                    <Button onClick={() => setup(f.provider)} disabled={busy === f.provider}>
                      {busy === f.provider ? "Setting up..." : active ? "Manage" : "Set Up"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {others.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-bold">More Integrations</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {others.map((i) => (
                  <Card key={i.provider} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold">{i.name}</h3>
                      <Badge tone={String(i.status || "").toUpperCase() === "ACTIVE" ? "green" : "slate"}>
                        {String(i.status || "INACTIVE").toUpperCase()}
                      </Badge>
                    </div>
                    {i.badge && <p className="mt-1"><Badge tone="amber">{i.badge}</Badge></p>}
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{i.description || ""}</p>
                    {i.category && <p className="mt-2 text-xs text-slate-500">Category: {i.category}</p>}
                    <div className="mt-4">
                      <Button variant="secondary" onClick={() => setup(i.provider)} disabled={busy === i.provider}>
                        {busy === i.provider ? "Setting up..." : "Set Up"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {others.length === 0 && integrations.length === 0 && (
            <div className="mt-6">
              <EmptyState title="No other integrations yet" subtitle="More integrations will appear here as they become available." />
            </div>
          )}
        </>
      )}
    </div>
  );
}
