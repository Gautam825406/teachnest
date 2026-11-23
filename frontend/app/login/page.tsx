"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth, ApiError } from "@/lib/api";
import { Button, ErrorBox, Field, Input, ThemeToggle } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [demoBusy, setDemoBusy] = useState<string | null>(null);

  async function demoLogin(username: string, password: string) {
    setError(null);
    setDemoBusy(username);
    try {
      const data = await apiFetch<{ access_token: string; user: { id: number | string; username: string; email: string; role: string; tenant_id?: number | string; tenant_name?: string; org_code?: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) }
      );
      saveAuth(data.access_token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demo login failed. Please try again.");
    } finally {
      setDemoBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await apiFetch<{ access_token: string; user: { id: number | string; username: string; email: string; role: string; tenant_id?: number | string; tenant_name?: string; org_code?: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) }
      );
      saveAuth(data.access_token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please check your username and password and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">T</span>
          <p className="text-lg font-bold tracking-tight text-brand-700 dark:text-stone-100">TeachNest</p>
        </div>
        <h1 className="mt-6 text-lg font-semibold tracking-tight">Log in to your admin panel</h1>
        <p className="mt-1 text-sm text-stone-500">Enter your credentials to continue.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Username" required>
            <Input className="h-10" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </Field>
          <Field label="Password" required>
            <Input className="h-10" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Let's Go"}</Button>
        </form>
        <div className="mt-6 border-t border-stone-200 pt-4 dark:border-stone-800">
          <p className="text-center text-sm font-medium text-stone-700 dark:text-stone-200">No account? Try the demo instead</p>
          <p className="mt-1 text-center text-xs text-stone-500">Explore every feature with pre-filled demo data. No signup needed.</p>
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy || demoBusy !== null}
              onClick={() => demoLogin("admin", "Admin@123")}
            >
              {demoBusy === "admin" ? "Opening demo..." : "Try demo as Super Admin"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy || demoBusy !== null}
              onClick={() => demoLogin("teacher1", "Teacher@123")}
            >
              {demoBusy === "teacher1" ? "Opening demo..." : "Try demo as Teacher"}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">
            Demo logins — Admin: <span className="font-medium text-stone-700 dark:text-stone-300">admin / Admin@123</span>
            {" · "}Teacher: <span className="font-medium text-stone-700 dark:text-stone-300">teacher1 / Teacher@123</span>
            {" "}(Demo Academy, DEMO0001)
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-stone-500">
          No account yet? <Link href="/signup" className="font-medium text-brand-700 hover:underline dark:text-brand-300">Create your institute account</Link>
        </p>
      </div>
    </div>
  );
}
