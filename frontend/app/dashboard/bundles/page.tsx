"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Item Bundles"
      subtitle="Bundle courses, test series and e-books into one package."
      endpoint="/bundles"
      itemLabel="Bundle"
      searchPlaceholder="Search bundles..."
      fields={[
        { key: "name", label: "Bundle Name", required: true, placeholder: "e.g. Class 10 Complete Pack" },
        { key: "price", label: "Price (Rs.)", type: "number", placeholder: "999" },
        { key: "description", label: "Description", type: "textarea", placeholder: "What is included in this bundle?" },
        { key: "course_ids", label: "Courses", type: "multi", multiEndpoint: "/courses", multiLabelKey: "title" },
        { key: "test_series_ids", label: "Test Series", type: "multi", multiEndpoint: "/test-series", multiLabelKey: "title" },
        { key: "ebook_ids", label: "E-Books", type: "multi", multiEndpoint: "/ebooks", multiLabelKey: "title" },
      ]}
      columns={[
        { key: "name", label: "NAME" },
        { key: "price", label: "PRICE", format: "inr" },
        { key: "description", label: "DESCRIPTION" },
      ]}
    />
  );
}
