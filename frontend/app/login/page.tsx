"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth, ApiError } from "@/lib/api";
import { Button, ErrorBox, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">T</span>
          <p className="text-lg font-bold tracking-tight text-brand-700 dark:text-brand-300">TeachNest</p>
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
        <p className="mt-4 text-center text-sm text-stone-500">
          No account yet? <Link href="/signup" className="font-medium text-brand-700 hover:underline dark:text-brand-300">Create your institute account</Link>
        </p>
      </div>
    </div>
  );
}
