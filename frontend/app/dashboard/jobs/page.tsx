"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Latest Jobs"
      subtitle="Post the latest job openings for your students."
      endpoint="/jobs"
      itemLabel="Job"
      searchPlaceholder="Search jobs..."
      fields={[
        { key: "title", label: "Job Title", required: true, placeholder: "e.g. SSC CGL 2026 Notification" },
        { key: "thumbnail_url", label: "Thumbnail", type: "file", accept: "image/jpeg,image/png,image/webp", hint: "Upload a thumbnail image." },
        { key: "description", label: "Description", type: "textarea", required: true, placeholder: "Job details, eligibility, last date..." },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "description", label: "DESCRIPTION" },
      ]}
    />
  );
}
