"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Test Series"
      subtitle="Create and manage test series for your students."
      endpoint="/test-series"
      itemLabel="Test Series"
      searchPlaceholder="Search test series..."
      detailHref={(row) => `/dashboard/test-series/${row.id}`}
      detailLabel="Questions" 
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. Mathematics Mock Test Series" },
        { key: "category", label: "Category", placeholder: "e.g. Class 10" },
        { key: "price", label: "Price (Rs.)", type: "number", placeholder: "0" },
        { key: "validity_days", label: "Validity (Days)", type: "number", placeholder: "365" },
        { key: "description", label: "Description", type: "textarea", placeholder: "What does this test series cover?" },
      ]}
      columns={[
        { key: "title", label: "TITLE" },
        { key: "category", label: "CATEGORY" },
        { key: "price", label: "PRICE", format: "inr" },
        { key: "validity_days", label: "VALIDITY (DAYS)" },
      ]}
    />
  );
}
