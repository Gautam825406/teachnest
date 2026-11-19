"use client";
import CrudPage from "@/components/CrudPage";
import MiniManager from "@/components/MiniManager";

export default function PreviousPapersPage() {
  return (
    <div className="space-y-6">
      <CrudPage
        title="Previous Papers"
        subtitle="Upload previous year question papers for students."
        endpoint="/previous-papers"
        itemLabel="Previous Paper"
        searchPlaceholder="Search previous papers..."
        fields={[
          { key: "title", label: "Title", required: true, placeholder: "e.g. Board Exam 2025 - Mathematics" },
          { key: "exam_type_id", label: "Exam Type", type: "select", optionsEndpoint: "/exam-types", optionsLabelKey: "name" },
          { key: "year", label: "Year", type: "number", placeholder: "2025" },
          { key: "file_url", label: "Paper PDF", type: "file", accept: "application/pdf", hint: "Upload the question paper as a PDF." },
        ]}
        columns={[
          { key: "title", label: "TITLE" },
          { key: "year", label: "YEAR" },
          { key: "file_url", label: "FILE", format: "link" },
        ]}
      />
      <MiniManager
        title="Exam Types"
        endpoint="/exam-types"
        itemLabel="Exam Type"
        displayKeys={["name"]}
        fields={[{ key: "name", label: "Exam Type Name", required: true, placeholder: "e.g. Board Exam" }]}
      />
    </div>
  );
}
