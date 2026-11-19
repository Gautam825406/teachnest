"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Test Assignments"
      subtitle="Assign test series to students with a due date."
      endpoint="/test-assignments"
      itemLabel="Test Assignment"
      searchPlaceholder="Search test assignments..."
      headerActions={
        <a href="/dashboard/test-assignments/student-assignments">
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">Student Assignments</button>
        </a>
      }
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. Weekly Mock Test 1" },
        { key: "test_series_id", label: "Test Series", type: "select", optionsEndpoint: "/test-series", optionsLabelKey: "title" },
        { key: "student_id", label: "Student", type: "select", optionsEndpoint: "/students", optionsLabelKey: "name" },
        { key: "due_date", label: "Due Date", type: "date" },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "due_date", label: "DUE DATE", format: "date" },
      ]}
    />
  );
}
