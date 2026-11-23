"use client";
import { useCallback, useEffect, useState } from "react";
import { apiKeysApi, getStoredUser, integrationsApi, integrationsStatusApi, messagingApi, type ApiKeyStatus, type Integration, type IntegrationStatus } from "@/lib/api";
import { Badge, BannerHeader, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Select, Textarea } from "@/components/ui";

interface LiveCard {
  key: string;
  name: string;
  description: string;
  envVars: string;
  configured: (s: IntegrationStatus) => boolean;
  detail: (s: IntegrationStatus) => string;
}

const LIVE_CARDS: LiveCard[] = [
  {
    key: "cashfree",
    name: "Cashfree — Payment Gateway",
    description: "Collects course, test series and wallet payments from students via UPI, cards and net banking.",
    envVars: "CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV (PROD or SANDBOX) — set in Render",
    configured: (s) => s.cashfree?.configured === true,
    detail: (s) =>
      s.cashfree?.configured
        ? `Configured — environment: ${s.cashfree.env || "unknown"}`
        : "Not configured — set CASHFREE_APP_ID / CASHFREE_SECRET_KEY in Render",
  },
  {
    key: "groq",
    name: "TeachNest AI (Groq)",
    description: "Powers the AI Question Paper Generator: drafts questions from uploaded files or pasted text.",
    envVars: "GROQ_API_KEY — add it in AI API Keys above, or set it in Render",
    configured: (s) => s.groq?.configured === true,
    detail: (s) => (s.groq?.configured ? "Configured" : "Not configured — add a Groq key in AI API Keys above"),
  },
  {
    key: "gemini",
    name: "TeachNest AI (Gemini)",
    description: "Alternative AI provider for the Question Paper Generator — pick Groq or Gemini when generating.",
    envVars: "GEMINI_API_KEY — add it in AI API Keys above, or set it in Render",
    configured: (s) => s.gemini?.configured === true,
    detail: (s) => (s.gemini?.configured ? "Configured" : "Not configured — add a Gemini key in AI API Keys above"),
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Sends enrolment confirmations, payment receipts and test reminders to students on WhatsApp.",
    envVars: "WhatsApp provider credentials — set in Render",
    configured: (s) => s.whatsapp?.configured === true,
    detail: (s) => (s.whatsapp?.configured ? "Configured" : "Not configured"),
  },
  {
    key: "live",
    name: "Live Classes",
    description: "Hosts live seminars and classes for students.",
    envVars: "Live provider credentials (100ms or Agora) — set in Render",
    configured: (s) => s.live?.configured === true,
    detail: (s) =>
      s.live?.configured
        ? `Configured — provider: ${s.live.provider || "unknown"}`
        : `Not configured — provider: ${s.live?.provider || "100ms / Agora"}. Live classes are demo-only until configured.`,
  },
  {
    key: "fcm",
    name: "Push Notifications (FCM)",
    description: "Sends push notifications to the student mobile app.",
    envVars: "FCM credentials — set in Render",
    configured: (s) => s.fcm?.configured === true,
    detail: (s) => (s.fcm?.configured ? "Configured" : "Not configured"),
  },
  {
    key: "sms",
    name: "SMS OTP",
    description: "Sends one-time passwords for student login on the mobile app.",
    envVars: "SMS provider credentials — set in Render",
    configured: (s) => s.sms?.configured === true,
    detail: (s) =>
      s.sms?.configured
        ? `Configured — provider: ${s.sms.provider || "unknown"}`
        : "Not configured",
  },
];

const WHATSAPP_TEMPLATES = [
  { value: "enrolment", label: "Enrolment confirmation" },
  { value: "payment_receipt", label: "Payment receipt" },
  { value: "test_reminder", label: "Test reminder" },
];

const AI_KEY_PROVIDERS = [
  {
    key: "groq",
    name: "Groq",
    hint: "Get a key at console.groq.com → API Keys (starts with gsk_). Model: llama-3.3-70b-versatile.",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    key: "gemini",
    name: "Gemini",
    hint: "Get a key at Google AI Studio → Get API key (starts with AIza). Model: gemini-2.0-flash.",
    keyUrl: "https://aistudio.google.com/apikey",
  },
];

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // AI API keys (admin only)
  const isAdmin = ["Super Admin", "Admin"].includes(getStoredUser()?.role || "");
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({ groq: "", gemini: "" });
  const [keyBusy, setKeyBusy] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyResults, setKeyResults] = useState<Record<string, string>>({});

  // WhatsApp test form
  const [waTo, setWaTo] = useState("");
  const [waTemplate, setWaTemplate] = useState(WHATSAPP_TEMPLATES[0].value);
  const [waParams, setWaParams] = useState("");
  const [waBusy, setWaBusy] = useState(false);
  const [waResult, setWaResult] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);

  // Push test form
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushTopic, setPushTopic] = useState("all_students");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusError(null);
    try {
      const s = await integrationsStatusApi.get();
      setStatus(s);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Could not load live integration status.");
    }
    if (isAdmin) {
      try {
        const data = await apiKeysApi.list();
        setApiKeys(data.keys || []);
      } catch {
        setApiKeys([]);
      }
    }
    try {
      const data = await integrationsApi.list();
      setIntegrations(Array.isArray(data) ? data : data.items || []);
    } catch {
      // Legacy list is optional; live status above is the source of truth.
      setIntegrations([]);
    } finally { setLoading(false); }
  }, [isAdmin]);

  async function saveApiKey(provider: string) {
    const value = (keyInputs[provider] || "").trim();
    if (!value) {
      setKeyError("Paste the API key first.");
      return;
    }
    setKeyBusy(`save-${provider}`);
    setKeyError(null);
    setKeyResults((r) => ({ ...r, [provider]: "" }));
    try {
      const updated = await apiKeysApi.save(provider, value);
      setApiKeys((prev) => {
        const rest = prev.filter((k) => k.provider !== provider);
        return [...rest, updated];
      });
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      setKeyResults((r) => ({ ...r, [provider]: `${provider} key saved.` }));
      load();
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not save the API key.");
    } finally { setKeyBusy(null); }
  }

  async function testApiKey(provider: string) {
    setKeyBusy(`test-${provider}`);
    setKeyError(null);
    try {
      const res = await apiKeysApi.test(provider);
      setKeyResults((r) => ({ ...r, [provider]: res.message }));
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not test the API key.");
    } finally { setKeyBusy(null); }
  }

  async function removeApiKey(provider: string) {
    setKeyBusy(`remove-${provider}`);
    setKeyError(null);
    setKeyResults((r) => ({ ...r, [provider]: "" }));
    try {
      const updated = await apiKeysApi.remove(provider);
      setApiKeys((prev) => {
        const rest = prev.filter((k) => k.provider !== provider);
        return [...rest, updated];
      });
      setKeyResults((r) => ({ ...r, [provider]: `${provider} key removed. The generator will fall back to the Render env key, if any.` }));
      load();
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not remove the API key.");
    } finally { setKeyBusy(null); }
  }

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

  async function sendWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    setWaBusy(true);
    setWaResult(null);
    setWaError(null);
    try {
      const params: string[] = waParams
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const res = await messagingApi.whatsappSend({ to: waTo.trim(), template: waTemplate, params });
      setWaResult(res.message || (res.status ? `WhatsApp message ${res.status}.` : "WhatsApp message sent."));
    } catch (err) {
      setWaError(err instanceof Error ? err.message : "Could not send the WhatsApp message.");
    } finally { setWaBusy(false); }
  }

  async function sendPush(e: React.FormEvent) {
    e.preventDefault();
    setPushBusy(true);
    setPushResult(null);
    setPushError(null);
    try {
      const res = await messagingApi.pushSend({ title: pushTitle.trim(), body: pushBody.trim(), topic: pushTopic.trim() || undefined });
      setPushResult(res.message || (res.status ? `Push notification ${res.status}.` : "Push notification sent."));
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not send the push notification.");
    } finally { setPushBusy(false); }
  }

  const others = integrations.filter((i) => !LIVE_CARDS.some((c) => c.key === i.provider));

  return (
    <div>
      <BannerHeader
        title="Integrations"
        subtitle="Live status of every connected service. AI keys (Groq, Gemini) can be added right here in the admin panel — other credentials live in Render environment variables."
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
          {statusError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              Live status is unavailable right now: {statusError} The cards below show “Not configured” until the backend
              integration-status endpoint responds.
            </div>
          )}
          {isAdmin && (
            <div className="mb-6">
              <h2 className="mb-1 text-lg font-bold">AI API Keys</h2>
              <p className="mb-3 text-sm text-stone-500">
                Add your Groq and Gemini keys here — no need to touch Render. Keys are stored encrypted in the
                backend database for this institute only, and only a masked preview is ever shown. A key saved here
                takes priority over the Render environment key. Only admins can see or change keys.
              </p>
              <ErrorBox message={keyError} />
              <div className="grid gap-4 sm:grid-cols-2">
                {AI_KEY_PROVIDERS.map((p) => {
                  const st = apiKeys.find((k) => k.provider === p.key);
                  const configured = st?.configured === true;
                  return (
                    <Card key={p.key} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold">{p.name}</h3>
                        <Badge tone={configured ? "green" : "slate"}>
                          {configured
                            ? st?.source === "admin_panel"
                              ? "CONFIGURED — ADMIN PANEL"
                              : "CONFIGURED — RENDER ENV"
                            : "NOT CONFIGURED"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{p.hint}</p>
                      <p className="mt-1 text-sm">
                        <a href={p.keyUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                          Get a {p.name} API key →
                        </a>
                      </p>
                      {configured && st?.masked && (
                        <p className="mt-2 text-sm text-stone-500">
                          Saved key: <span className="font-mono font-medium text-stone-700 dark:text-stone-200">{st.masked}</span>
                        </p>
                      )}
                      <div className="mt-4 space-y-3">
                        <Field label={`${p.name} API key`} hint="Paste the full key. It is sent once and stored encrypted — it is never shown again.">
                          <Input
                            type="password"
                            autoComplete="off"
                            value={keyInputs[p.key] || ""}
                            onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.key]: e.target.value }))}
                            placeholder={configured ? "Paste a new key to replace the saved one" : `Paste your ${p.name} API key`}
                          />
                        </Field>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => saveApiKey(p.key)} disabled={keyBusy !== null}>
                            {keyBusy === `save-${p.key}` ? "Saving..." : configured ? "Update Key" : "Save Key"}
                          </Button>
                          <Button variant="secondary" onClick={() => testApiKey(p.key)} disabled={keyBusy !== null || !configured}>
                            {keyBusy === `test-${p.key}` ? "Testing..." : "Test Key"}
                          </Button>
                          {configured && st?.source === "admin_panel" && (
                            <Button variant="danger" onClick={() => removeApiKey(p.key)} disabled={keyBusy !== null}>
                              {keyBusy === `remove-${p.key}` ? "Removing..." : "Remove"}
                            </Button>
                          )}
                        </div>
                        {keyResults[p.key] && (
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{keyResults[p.key]}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {LIVE_CARDS.map((c) => {
              const configured = status ? c.configured(status) : false;
              return (
                <Card key={c.key} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold">{c.name}</h3>
                    <Badge tone={configured ? "green" : "slate"}>
                      {configured ? "CONFIGURED" : "NOT CONFIGURED"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{c.description}</p>
                  <p className="mt-2 text-sm font-medium">{status ? c.detail(status) : "Status unavailable — backend endpoint not responding yet."}</p>
                  <p className="mt-2 text-xs text-stone-500">Needs: {c.envVars}</p>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-lg font-bold">Send a WhatsApp test message</h3>
              <p className="mt-1 text-sm text-stone-500">
                Sends a real message through the configured WhatsApp provider. If WhatsApp is not configured, the
                backend returns an honest “not configured” error — nothing is faked.
              </p>
              <form onSubmit={sendWhatsApp} className="mt-4 space-y-4">
                <Field label="Recipient mobile number" required hint="Include the country code, e.g. 919876543210.">
                  <Input value={waTo} onChange={(e) => setWaTo(e.target.value)} required placeholder="919876543210" />
                </Field>
                <Field label="Template" required>
                  <Select value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} required>
                    {WHATSAPP_TEMPLATES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Template params" hint="Optional. Comma-separated values in template order, e.g. Aarav, Class 10 Maths.">
                  <Input value={waParams} onChange={(e) => setWaParams(e.target.value)} placeholder="Aarav, Class 10 Maths" />
                </Field>
                <ErrorBox message={waError} />
                {waResult && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    {waResult}
                  </div>
                )}
                <Button type="submit" disabled={waBusy}>{waBusy ? "Sending..." : "Send WhatsApp Message"}</Button>
              </form>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-bold">Send a push notification</h3>
              <p className="mt-1 text-sm text-stone-500">
                Sends a push notification to the student mobile app through FCM. If push is not configured, the
                backend returns an honest “not configured” error.
              </p>
              <form onSubmit={sendPush} className="mt-4 space-y-4">
                <Field label="Title" required>
                  <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} required placeholder="e.g. New test series available" />
                </Field>
                <Field label="Topic" required hint="FCM topic the notification is sent to (per-student push needs registered device tokens).">
                  <Input value={pushTopic} onChange={(e) => setPushTopic(e.target.value)} required placeholder="all_students" />
                </Field>
                <Field label="Message" required>
                  <Textarea rows={3} value={pushBody} onChange={(e) => setPushBody(e.target.value)} required placeholder="Write the notification message..." />
                </Field>
                <ErrorBox message={pushError} />
                {pushResult && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    {pushResult}
                  </div>
                )}
                <Button type="submit" disabled={pushBusy}>{pushBusy ? "Sending..." : "Send Push Notification"}</Button>
              </form>
            </Card>
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
                    <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{i.description || ""}</p>
                    {i.category && <p className="mt-2 text-xs text-stone-500">Category: {i.category}</p>}
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
          {others.length === 0 && integrations.length === 0 && !statusError && (
            <div className="mt-6">
              <EmptyState title="No other integrations yet" subtitle="More integrations will appear here as they become available." />
            </div>
          )}
        </>
      )}
    </div>
  );
}
