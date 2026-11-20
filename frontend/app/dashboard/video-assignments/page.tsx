"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Video Assignments"
      subtitle="Assign videos to students and review their submissions."
      endpoint="/video-assignments"
      itemLabel="Video Assignment"
      searchPlaceholder="Search video assignments..."
      headerActions={
        <a href="/dashboard/video-assignments/submissions">
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-stone-700 border border-stone-300 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200">View Submissions</button>
        </a>
      }
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. Watch and summarise Chapter 5" },
        { key: "course_id", label: "Course", type: "select", optionsEndpoint: "/courses", optionsLabelKey: "title" },
        { key: "video_url", label: "Video URL", type: "url", placeholder: "https://..." },
        { key: "due_date", label: "Due Date", type: "date" },
        { key: "description", label: "Description", type: "textarea", placeholder: "Instructions for students..." },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "video_url", label: "VIDEO", format: "link" },
        { key: "due_date", label: "DUE DATE", format: "date" },
      ]}
    />
  );
}
