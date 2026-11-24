"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPlatformToken } from "@/lib/api";

/** /super-admin redirects to the dashboard (or to login when signed out). */
export default function SuperAdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getPlatformToken() ? "/super-admin/dashboard" : "/super-admin/login");
  }, [router]);
  return null;
}
