"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth, ApiError } from "@/lib/api";
import { Button, ErrorBox, Field, Input } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow dark:border-slate-800 dark:bg-slate-900">
        <p className="text-center text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">TeachNest</p>
        <h1 className="mt-6 text-xl font-bold">Create your institute account</h1>
        <p className="mt-1 text-sm text-slate-500">Your institute becomes a tenant and you become its Super Admin.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Institute / Tenant Name" required>
            <Input placeholder="Enter your institute name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
          </Field>
          <Field label="Username" required>
            <Input placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </Field>
          <Field label="Email" required>
            <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <Input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={6} />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account..." : "Create Account"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link href="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
