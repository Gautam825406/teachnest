"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Current Affairs"
      subtitle="Publish daily current affairs for exam preparation."
      endpoint="/current-affairs"
      itemLabel="Current Affair"
      searchPlaceholder="Search current affairs..."
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. Union Budget 2026 highlights" },
        { key: "language", label: "Language", type: "select", options: [{ value: "English", label: "English" }, { value: "Hindi", label: "Hindi" }] },
        { key: "published_date", label: "Published Date", type: "date" },
        { key: "content", label: "Content", type: "textarea", required: true, placeholder: "Write the current affair..." },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "language", label: "LANGUAGE" },
        { key: "published_date", label: "PUBLISHED", format: "date" },
      ]}
    />
  );
}
