"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Student Assignments"
      subtitle="Scores and status for test assignments given to students."
      endpoint="/test-assignments/student-assignments"
      itemLabel="Student Assignment"
      searchPlaceholder="Search student assignments..."
      fields={[
        { key: "test_assignment_id", label: "Test Assignment", type: "select", optionsEndpoint: "/test-assignments", optionsLabelKey: "title" },
        { key: "student_id", label: "Student", type: "select", optionsEndpoint: "/students", optionsLabelKey: "name" },
        { key: "score", label: "Score", type: "number", placeholder: "0" },
        { key: "total_marks", label: "Total Marks", type: "number", placeholder: "100" },
        { key: "status", label: "Status", type: "select", options: [{ value: "pending", label: "Pending" }, { value: "completed", label: "Completed" }, { value: "in_progress", label: "In Progress" }] },
      ]}
      columns={[
        { key: "student_name", label: "STUDENT" },
        { key: "score", label: "SCORE" },
        { key: "total_marks", label: "TOTAL MARKS" },
        { key: "status", label: "STATUS", format: "badge" },
      ]}
    />
  );
}
