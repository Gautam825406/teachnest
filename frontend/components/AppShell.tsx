"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import { ALL_NAV_ITEMS, NAV } from "@/lib/nav";
import { clearAuth, getStoredUser, type AuthUser } from "@/lib/api";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("cw_theme", dark ? "dark" : "light");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dark, setDark] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUser(getStoredUser());
    const saved = localStorage.getItem("cw_theme");
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const openPalette = useCallback(() => { setPaletteOpen(true); setQuery(""); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (paletteOpen) inputRef.current?.focus(); }, [paletteOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(q));
  }, [query]);

  const logout = () => { clearAuth(); router.push("/login"); };

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-lg font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
          TeachNest
        </Link>
        <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <nav className="flex-1 px-3 pb-6">
        {NAV.map((g) => (
          <div key={g.group} className="mt-4 first:mt-0">
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400">{g.group}</p>
            {g.items.map((item) => (
              <div key={item.href + item.label}>
                <Link
                  href={item.href}
                  onClick={() => setDrawer(false)}
                  className={`block rounded-lg px-3 py-2 text-sm ${pathname === item.href.split("?")[0] ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link
                    key={child.href + child.label}
                    href={child.href}
                    onClick={() => setDrawer(false)}
                    className={`ml-4 block rounded-lg px-3 py-1.5 text-[13px] ${pathname === child.href.split("?")[0] ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 dark:border-slate-800 lg:block">{sidebar}</aside>
      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Link href="/dashboard" className="font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400 lg:hidden">TeachNest</Link>
          <button
            onClick={openPalette}
            className="hidden flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 sm:flex sm:max-w-md"
          >
            <Search size={16} /> Quick find...
            <kbd className="ml-auto rounded border border-slate-300 px-1.5 py-0.5 text-xs dark:border-slate-600">Ctrl+K</kbd>
          </button>
          <button onClick={openPalette} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 sm:hidden" aria-label="Quick find"><Search size={18} /></button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { const next = !dark; setDark(next); applyTheme(next); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-700"
              title="Toggle Theme"
            >
              {dark ? <span className="flex items-center gap-1"><Sun size={14} /> Light</span> : <span className="flex items-center gap-1"><Moon size={14} /> Dark</span>}
            </button>
            {user && (
              <div className="hidden items-center gap-2 md:flex">
                <div className="text-right leading-tight">
                  <p className="text-sm font-semibold">{user.tenant_name || user.username}</p>
                  <p className="text-xs text-slate-500">
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">{(user.role || "USER").toUpperCase()}</span>{" "}
                    <span className="text-emerald-600">• Active</span>
                  </p>
                </div>
              </div>
            )}
            <button onClick={logout} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Logout" aria-label="Logout"><LogOut size={18} /></button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>

        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
          © All Rights Reserved. | <Link href="/dashboard/settings" className="hover:underline">Privacy Policy</Link> • <Link href="/dashboard/settings" className="hover:underline">Terms and Conditions</Link>
        </footer>
      </div>

      {/* Command palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={() => setPaletteOpen(false)}>
          <div className="mx-auto mt-20 max-w-lg overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <Search size={18} className="text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quick find... type a page name"
                className="flex-1 bg-transparent text-sm outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { setPaletteOpen(false); router.push(results[0].href); } }}
              />
              <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-xs dark:border-slate-600">Esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <p className="p-3 text-sm text-slate-500">No matching pages.</p>}
              {results.map((item) => (
                <button
                  key={item.href + item.label}
                  onClick={() => { setPaletteOpen(false); router.push(item.href); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
