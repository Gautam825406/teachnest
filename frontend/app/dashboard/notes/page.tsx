"use client";
import { useState } from "react";
import CrudPage from "@/components/CrudPage";
import { Button } from "@/components/ui";

type Kind = "note" | "folder" | "syllabus" | "uploaded";

const TABS: { key: Kind; label: string; title: string; subtitle: string; item: string }[] = [
  { key: "note", label: "Add Notes", title: "Notes", subtitle: "Create and manage study notes.", item: "Note" },
  { key: "folder", label: "Folder Notes (Beta)", title: "Folder Notes", subtitle: "Organise notes into folders.", item: "Folder" },
  { key: "syllabus", label: "Syllabus", title: "Syllabus", subtitle: "Manage course syllabi.", item: "Syllabus" },
  { key: "uploaded", label: "Uploaded Notes", title: "Uploaded Notes", subtitle: "Notes uploaded as PDF files.", item: "Uploaded Note" },
];

export default function NotesPage() {
  const [tab, setTab] = useState<Kind>("note");
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
        endpoint="/notes"
        itemLabel={active.item}
        searchPlaceholder={`Search ${active.title.toLowerCase()}...`}
        extraQuery={{ kind: tab }}
        fields={[
          { key: "title", label: "Title", required: true, placeholder: "e.g. Chapter 5 Notes" },
          { key: "folder", label: "Folder", placeholder: "e.g. Mathematics" },
          ...(tab === "uploaded" || tab === "syllabus"
            ? [{ key: "file_url", label: "PDF File", type: "file" as const, accept: "application/pdf", hint: "Upload the PDF file." }]
            : []),
          { key: "description", label: "Description", type: "textarea", placeholder: "Short description..." },
        ]}
        columns={[
          { key: "title", label: "TITLE" },
          { key: "folder", label: "FOLDER" },
          { key: "file_url", label: "FILE", format: "link" },
          { key: "description", label: "DESCRIPTION" },
        ]}
        beforeSave={(v) => ({ ...v, kind: tab })}
      />
    </div>
  );
}
