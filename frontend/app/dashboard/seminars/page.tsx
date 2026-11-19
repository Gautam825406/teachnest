"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Seminars"
      subtitle="Schedule live seminars and share the meeting link with students."
      endpoint="/seminars"
      itemLabel="Seminar"
      searchPlaceholder="Search seminars..."
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. Career Guidance Seminar" },
        { key: "category", label: "Category", placeholder: "e.g. Guidance" },
        { key: "scheduled_at", label: "Scheduled At", type: "datetime" },
        { key: "meeting_url", label: "Meeting URL", type: "url", placeholder: "https://..." },
        { key: "description", label: "Description", type: "textarea", placeholder: "What will this seminar cover?" },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "category", label: "CATEGORY" },
        { key: "scheduled_at", label: "SCHEDULED AT", format: "date" },
        { key: "meeting_url", label: "MEETING", format: "link" },
      ]}
    />
  );
}
