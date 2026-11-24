"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearPlatformAuth, getPlatformToken, getPlatformUsername } from "@/lib/api";
import { Button, ThemeToggle } from "@/components/ui";

const NAV = [
  { href: "/super-admin/dashboard", label: "Dashboard" },
  { href: "/super-admin/institutes", label: "Institutes" },
  { href: "/super-admin/plans", label: "Plans" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const isLogin = pathname === "/super-admin/login";

  useEffect(() => {
    if (isLogin) {
      setChecked(true);
      return;
    }
    if (!getPlatformToken()) {
      router.replace("/super-admin/login");
      return;
    }
    setUsername(getPlatformUsername());
    setChecked(true);
  }, [isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;
  if (!checked) return null;

  function logout() {
    // Clears ONLY the platform token — the tenant admin session is untouched.
    clearPlatformAuth();
    router.push("/super-admin/login");
  }

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950">
      <aside className="flex w-56 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">T</span>
          <div>
            <p className="text-sm font-bold tracking-tight text-brand-700 dark:text-stone-100">TeachNest</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Platform Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/super-admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 px-5 py-4 dark:border-stone-800">
          {username && <p className="mb-2 truncate text-xs text-stone-500 dark:text-stone-400">Signed in as {username}</p>}
          <Button variant="secondary" className="w-full" onClick={logout}>
            Log out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Platform Super Admin</p>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
