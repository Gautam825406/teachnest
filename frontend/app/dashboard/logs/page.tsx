"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="System Logs"
      subtitle="Course activity logs recorded by the system."
      endpoint="/course-logs"
      itemLabel="Log"
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      fields={[]}
      columns={[
        { key: "course_title", label: "COURSE" },
        { key: "action", label: "ACTION" },
        { key: "message", label: "MESSAGE" },
        { key: "created_at", label: "DATE", format: "date" },
      ]}
    />
  );
}
