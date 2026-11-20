"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  Image,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Package,
  PlaySquare,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  TicketPercent,
  UserPlus,
  Users,
  Video,
  X,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { ALL_NAV_ITEMS, NAV } from "@/lib/nav";
import { clearAuth, getStoredUser, type AuthUser } from "@/lib/api";

/** One muted icon per nav label. Children reuse the same map in the palette. */
const NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Courses: BookOpen,
  "All Courses": BookOpen,
  "Add Course": BookOpen,
  "Course Category": BookOpen,
  "Course Sub Category": BookOpen,
  "Add Subject": BookOpen,
  "Add Topic": BookOpen,
  "Add Videos": Video,
  Packages: Package,
  "Copy Course": BookOpen,
  Teachers: Users,
  Seminars: CalendarDays,
  "Item Bundles": Package,
  "YouTube Playlist": PlaySquare,
  "Test Series": ClipboardList,
  "AI Question Paper Generator": Sparkles,
  "Video Assignments": Video,
  "Test Assignments": FileCheck,
  "Notes & Docs": FileText,
  "Previous Papers": Archive,
  "Score Sheet": BarChart3,
  "E-Books": BookMarked,
  Students: GraduationCap,
  Leads: UserPlus,
  "Toppers & Reviews": Star,
  "App Banners": Image,
  "Push Notifications": Bell,
  "Current Affairs": Newspaper,
  "Latest Jobs": Briefcase,
  "Purchases & Orders": ShoppingCart,
  "Discounts & Coupons": TicketPercent,
  "OTP Usage": KeyRound,
  "Help & Support": LifeBuoy,
  Integrations: Plug,
  "User Management": ShieldCheck,
  Users: Users,
  Roles: ShieldCheck,
  "System Logs": ScrollText,
  "Account Settings": Settings,
};

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("cw_theme", dark ? "dark" : "light");
}

function initialsFor(user: AuthUser | null): string {
  const name = user?.tenant_name || user?.username || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
  const isActive = (href: string) => pathname === href.split("?")[0];

  const navLinkClass = (active: boolean) =>
    `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-all duration-200 ${
      active
        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"
        : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
    }`;

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-stone-900">
      {/* Wordmark */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setDrawer(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
            <GraduationCap size={18} className="text-white" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-brand-700 dark:text-stone-100">TeachNest</span>
            <span className="block text-[11px] text-stone-500 dark:text-stone-400">Admin</span>
          </span>
        </Link>
        <button className="rounded-lg p-2 text-stone-500 transition-colors duration-200 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
      </div>

      <nav className="flex-1 px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group} className="mt-4 first:mt-2">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">{g.group}</p>
            {g.items.map((item) => {
              const Icon = NAV_ICONS[item.label] ?? LayoutDashboard;
              const active = isActive(item.href);
              return (
                <div key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawer(false)}
                    className={navLinkClass(active)}
                    aria-current={active ? "page" : undefined}
                  >
                    <span aria-hidden className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-600 transition-all duration-200 ${active ? "scale-y-100 opacity-100" : "scale-y-50 opacity-0"}`} />
                    <Icon size={16} className={active ? "shrink-0 text-brand-700 dark:text-brand-200" : "shrink-0 text-stone-500 dark:text-stone-400"} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {item.children && (
                    <div className="mb-1 ml-[22px] border-l border-stone-200 pl-3 dark:border-stone-800">
                      {item.children.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href + child.label}
                            href={child.href}
                            onClick={() => setDrawer(false)}
                            className={`relative block rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200 ${
                              childActive
                                ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"
                                : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                            }`}
                            aria-current={childActive ? "page" : undefined}
                          >
                            <span aria-hidden className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-600 transition-all duration-200 ${childActive ? "scale-y-100 opacity-100" : "scale-y-50 opacity-0"}`} />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">
        <p className="text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
          TeachNest <span className="mx-1">•</span> v3.0.0
        </p>
        <p className="text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">Admin Panel</p>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-stone-600 transition-colors duration-200 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <LogOut size={16} className="shrink-0 text-stone-500 dark:text-stone-400" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 dark:border-stone-800 lg:block">{sidebar}</aside>
      {/* Mobile drawer */}
      {drawer && (
        <div className="motion-fade-in fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 sm:px-6">
          <button className="rounded-lg p-2 text-stone-600 transition-colors duration-200 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" onClick={() => setDrawer(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
              <GraduationCap size={18} className="text-white" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-brand-700 dark:text-stone-100">TeachNest</span>
          </Link>
          <button
            onClick={openPalette}
            className="hidden h-9 flex-1 items-center gap-2 rounded-lg border border-stone-300 px-3 text-[13px] text-stone-400 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600 sm:flex sm:max-w-md"
          >
            <Search size={16} className="shrink-0 text-stone-400" />
            <span className="truncate">Quick find...</span>
            <kbd className="ml-auto shrink-0 rounded border border-stone-300 px-1.5 py-0.5 text-[11px] text-stone-500 dark:border-stone-600 dark:text-stone-400">Ctrl+K</kbd>
          </button>
          <button onClick={openPalette} className="rounded-lg p-2 text-stone-600 transition-colors duration-200 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 sm:hidden" aria-label="Quick find"><Search size={18} /></button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { const next = !dark; setDark(next); applyTheme(next); }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-600 transition-colors duration-200 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <span key={dark ? "sun" : "moon"} className="motion-icon-spin flex items-center justify-center">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </span>
            </button>
            {user && (
              <div className="hidden items-center gap-2.5 md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-[12px] font-semibold text-white">
                  {initialsFor(user)}
                </span>
                <div className="leading-tight">
                  <p className="text-[13px] font-semibold text-stone-900 dark:text-stone-100">{user.tenant_name || user.username}</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {(user.role || "USER").toUpperCase()}{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">• Active</span>
                  </p>
                </div>
              </div>
            )}
            <button onClick={logout} className="rounded-lg p-2 text-stone-600 transition-colors duration-200 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" title="Logout" aria-label="Logout"><LogOut size={18} /></button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>

        <footer className="border-t border-stone-200 px-4 py-4 text-center text-[12px] text-stone-400 dark:border-stone-800 dark:text-stone-500">
          © All Rights Reserved. <span className="mx-1">|</span> <Link href="/dashboard/settings" className="hover:text-stone-600 hover:underline dark:hover:text-stone-300">Privacy Policy</Link> <span className="mx-1">•</span> <Link href="/dashboard/settings" className="hover:text-stone-600 hover:underline dark:hover:text-stone-300">Terms and Conditions</Link>
        </footer>
      </div>

      {/* Command palette */}
      {paletteOpen && (
        <div className="motion-fade-in fixed inset-0 z-50 bg-black/60 p-4" onClick={() => setPaletteOpen(false)}>
          <div className="motion-pop-in mx-auto mt-20 max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <Search size={18} className="shrink-0 text-stone-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quick find... type a page name"
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { setPaletteOpen(false); router.push(results[0].href); } }}
              />
              <kbd className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] text-stone-500 dark:border-stone-600 dark:text-stone-400">Esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <p className="p-3 text-[13px] text-stone-500 dark:text-stone-400">No matching pages.</p>}
              {results.map((item) => {
                const Icon = NAV_ICONS[item.label] ?? LayoutDashboard;
                return (
                  <button
                    key={item.href + item.label}
                    onClick={() => { setPaletteOpen(false); router.push(item.href); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-stone-700 transition-colors duration-200 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <Icon size={16} className="shrink-0 text-stone-500 dark:text-stone-400" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-stone-200 px-4 py-2.5 text-[11px] text-stone-400 dark:border-stone-800 dark:text-stone-500">
              Type to filter &nbsp;•&nbsp; Enter to open the first result &nbsp;•&nbsp; Esc to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
