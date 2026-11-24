"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, platformApi, savePlatformAuth } from "@/lib/api";
import { Button, ErrorBox, Field, Input, ThemeToggle } from "@/components/ui";

export default function SuperAdminLoginPage() {
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
      const data = await platformApi.login(username.trim(), password);
      savePlatformAuth(data.access_token, username.trim());
      router.push("/super-admin");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError(
          "Platform admin is not configured yet — set PLATFORM_ADMIN_USERNAME and PLATFORM_ADMIN_PASSWORD in Render."
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed. Please check your username and password and try again.");
      }
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
        <h1 className="mt-6 text-lg font-semibold tracking-tight">Platform Super Admin</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sign in with the platform admin account configured for this deployment. This is separate from institute admin logins.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Username" required>
            <Input
              className="h-10"
              placeholder="Enter your platform admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </Field>
          <Field label="Password" required>
            <Input
              className="h-10"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-stone-500">
          Institute admin? Use the regular admin login instead.
        </p>
      </div>
    </div>
  );
}
