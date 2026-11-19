"use client";
import { useState } from "react";
import CrudPage from "@/components/CrudPage";
import { Button } from "@/components/ui";

type LeadType = "custom" | "signup" | "expired";

const TABS: { key: LeadType; label: string; title: string; subtitle: string }[] = [
  { key: "custom", label: "Custom Leads", title: "Custom Leads", subtitle: "Leads added manually by your team." },
  { key: "signup", label: "Signup Leads", title: "Signup Leads", subtitle: "Leads from new student signups." },
  { key: "expired", label: "Expired Leads", title: "Expired Leads", subtitle: "Leads whose validity has expired." },
];

const FIELDS = [
  { key: "name", label: "Name", required: true, placeholder: "Lead name" },
  { key: "phone", label: "Phone", type: "tel" as const, placeholder: "10-digit mobile number" },
  { key: "email", label: "Email", type: "email" as const, placeholder: "lead@example.com" },
  { key: "source", label: "Source", placeholder: "e.g. Website, Referral, Walk-in" },
  { key: "status", label: "Status", type: "select" as const, options: [{ value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "converted", label: "Converted" }, { value: "lost", label: "Lost" }] },
];

const COLUMNS = [
  { key: "name", label: "NAME" },
  { key: "phone", label: "PHONE" },
  { key: "email", label: "EMAIL" },
  { key: "source", label: "SOURCE" },
  { key: "status", label: "STATUS", format: "badge" as const },
];

export default function LeadsPage() {
  const [tab, setTab] = useState<LeadType>("custom");
  const active = TABS.find((t) => t.key === tab)!;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.key} variant={tab === t.key ? "primary" : "secondary"} onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>
      <CrudPage
        key={tab}
        title={active.title}
        subtitle={active.subtitle}
        endpoint="/leads"
        itemLabel="Lead"
        searchPlaceholder="Search leads..."
        extraQuery={{ type: tab }}
        fields={FIELDS}
        columns={COLUMNS}
        beforeSave={(v) => ({ ...v, type: tab })}
      />
    </div>
  );
}
