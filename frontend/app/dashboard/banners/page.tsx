"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="App Banners"
      subtitle="Manage banners shown in the student app."
      endpoint="/banners"
      itemLabel="Banner"
      searchPlaceholder="Search banners..."
      fields={[
        { key: "name", label: "Banner Name", required: true, placeholder: "e.g. New Year Offer" },
        { key: "image_url", label: "Banner Image", type: "file", accept: "image/jpeg,image/png,image/webp", hint: "Upload the banner image." },
        { key: "banner_type", label: "Banner Type", type: "select", options: [{ value: "app", label: "App Banner" }, { value: "home", label: "Home Banner" }, { value: "course", label: "Course Banner" }, { value: "popup", label: "Popup Banner" }] },
        { key: "redirection_type", label: "Redirection Type", type: "select", options: [{ value: "none", label: "None" }, { value: "course", label: "Course" }, { value: "test_series", label: "Test Series" }, { value: "url", label: "URL" }] },
        { key: "redirection_value", label: "Redirection Value", placeholder: "Course/Test series ID or URL" },
        { key: "placement", label: "Placement", placeholder: "e.g. Home Top" },
        { key: "weight", label: "Weight (Sort Order)", type: "number", placeholder: "0" },
        { key: "status", label: "Status", type: "select", options: [{ value: "ACTIVE", label: "ACTIVE" }, { value: "INACTIVE", label: "INACTIVE" }] },
        { key: "popup", label: "Show as Popup", type: "checkbox" },
      ]}
      columns={[
        { key: "name", label: "NAME" },
        { key: "banner_type", label: "TYPE" },
        { key: "placement", label: "PLACEMENT" },
        { key: "status", label: "STATUS", format: "badge" },
        { key: "popup", label: "POPUP", format: "bool" },
      ]}
    />
  );
}
