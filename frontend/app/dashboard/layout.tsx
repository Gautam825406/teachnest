"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageFade } from "@/components/motion";
import { getToken } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) router.replace("/login");
    else setReady(true);
  }, [router]);
  if (!ready)
    return (
      <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950" role="status" aria-label="Loading dashboard">
        <div className="hidden w-64 shrink-0 border-r border-stone-200 p-4 dark:border-stone-800 lg:block" aria-hidden>
          <div className="motion-skeleton mb-6 h-8 w-32 rounded-lg" />
          <div className="space-y-2">
            <div className="motion-skeleton h-9 w-full rounded-lg" />
            <div className="motion-skeleton h-9 w-5/6 rounded-lg" />
            <div className="motion-skeleton h-9 w-full rounded-lg" />
            <div className="motion-skeleton h-9 w-4/6 rounded-lg" />
            <div className="motion-skeleton h-9 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex-1 p-6" aria-hidden>
          <div className="motion-skeleton mb-6 h-10 w-full max-w-md rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="motion-skeleton h-24 rounded-[10px]" />
            <div className="motion-skeleton h-24 rounded-[10px]" />
            <div className="motion-skeleton h-24 rounded-[10px]" />
            <div className="motion-skeleton h-24 rounded-[10px]" />
          </div>
          <div className="motion-skeleton mt-4 h-40 rounded-[10px]" />
        </div>
      </div>
    );
  return (
    <AppShell>
      <PageFade key={pathname}>{children}</PageFade>
    </AppShell>
  );
}
