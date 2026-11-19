"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Push Notifications"
      subtitle="Send push notifications to your students."
      endpoint="/notifications"
      itemLabel="Notification"
      searchPlaceholder="Search notifications..."
      createLabel="+ Send Notification" 
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. New test series available" },
        { key: "audience", label: "Audience", type: "select", options: [{ value: "all", label: "All Students" }, { value: "all_users", label: "All Users" }, { value: "course_students", label: "Course Students" }] },
        { key: "body", label: "Message", type: "textarea", required: true, placeholder: "Write the notification message..." },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "audience", label: "AUDIENCE" },
        { key: "body", label: "MESSAGE" },
        { key: "created_at", label: "SENT AT", format: "date" },
      ]}
    />
  );
}
