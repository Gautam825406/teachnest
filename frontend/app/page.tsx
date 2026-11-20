"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getToken() ? "/dashboard" : "/login");
  }, [router]);
  return <div className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-stone-500 dark:bg-stone-950">Loading...</div>;
}
