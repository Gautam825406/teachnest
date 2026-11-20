"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Loading } from "@/components/ui";

function ComingSoonInner() {
  const params = useSearchParams();
  const feature = params.get("feature") || "This feature";
  return (
    <Card className="mx-auto max-w-xl p-10 text-center">
      <p className="text-4xl">🚧</p>
      <h1 className="mt-4 text-2xl font-bold">{feature}</h1>
      <p className="mt-2 text-lg font-medium">Coming soon in Phase 2</p>
      <p className="mt-2 text-sm text-stone-500">
        {feature} is not part of Phase 1. It will be built in Phase 2 — no placeholder data is shown here.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        <Link href="/dashboard/courses"><Button variant="secondary">View Courses</Button></Link>
      </div>
    </Card>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={<Loading label="Loading..." />}>
      <ComingSoonInner />
    </Suspense>
  );
}
