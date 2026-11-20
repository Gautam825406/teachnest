"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth, ApiError } from "@/lib/api";
import { Button, ErrorBox, Field, Input, ThemeToggle } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await apiFetch<{ access_token: string; user: { id: number | string; username: string; email: string; role: string; tenant_id?: number | string; tenant_name?: string; org_code?: string } }>(
        "/auth/signup",
        { method: "POST", body: JSON.stringify({ tenant_name: tenantName, username, email, password }) }
      );
      saveAuth(data.access_token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign up failed. Please try again.");
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
        <h1 className="mt-6 text-lg font-semibold tracking-tight">Create your institute account</h1>
        <p className="mt-1 text-sm text-stone-500">Your institute becomes a tenant and you become its Super Admin.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Institute / Tenant Name" required>
            <Input className="h-10" placeholder="Enter your institute name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
          </Field>
          <Field label="Username" required>
            <Input className="h-10" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </Field>
          <Field label="Email" required>
            <Input className="h-10" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <Input className="h-10" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={6} />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account..." : "Create Account"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          Already have an account? <Link href="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-300">Log in</Link>
        </p>
      </div>
    </div>
  );
}
