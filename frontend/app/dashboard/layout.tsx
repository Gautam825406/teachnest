"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getToken } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) router.replace("/login");
    else setReady(true);
  }, [router]);
  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  return <AppShell>{children}</AppShell>;
}
