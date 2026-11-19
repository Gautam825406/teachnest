"use client";
import { useState } from "react";
import CrudPage from "@/components/CrudPage";
import { Button } from "@/components/ui";

type Tab = "testimonials" | "toppers" | "call-list";

export default function ToppersPage() {
  const [tab, setTab] = useState<Tab>("testimonials");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === "testimonials" ? "primary" : "secondary"} onClick={() => setTab("testimonials")}>Testimonials</Button>
        <Button variant={tab === "toppers" ? "primary" : "secondary"} onClick={() => setTab("toppers")}>Toppers</Button>
        <Button variant={tab === "call-list" ? "primary" : "secondary"} onClick={() => setTab("call-list")}>Toppers Call List</Button>
      </div>
      {tab === "testimonials" && (
        <CrudPage
          title="Testimonials"
          subtitle="Student reviews and testimonials shown on your website and app."
          endpoint="/testimonials"
          itemLabel="Testimonial"
          searchPlaceholder="Search testimonials..."
          fields={[
            { key: "student_name", label: "Student Name", required: true, placeholder: "e.g. Priya Sharma" },
            { key: "rating", label: "Rating (1-5)", type: "number", placeholder: "5" },
            { key: "text", label: "Testimonial", type: "textarea", required: true, placeholder: "What did the student say?" },
          ]}
          columns={[
            { key: "student_name", label: "STUDENT" },
            { key: "rating", label: "RATING" },
            { key: "text", label: "TESTIMONIAL" },
          ]}
        />
      )}
      {tab === "toppers" && (
        <CrudPage
          title="Toppers"
          subtitle="Top-performing students and their exam results."
          endpoint="/toppers"
          itemLabel="Topper"
          searchPlaceholder="Search toppers..."
          fields={[
            { key: "student_id", label: "Student", type: "select", optionsEndpoint: "/students", optionsLabelKey: "name" },
            { key: "student_name", label: "Student Name", placeholder: "Shown if no student is selected" },
            { key: "exam", label: "Exam", required: true, placeholder: "e.g. Board Exam 2026" },
            { key: "rank", label: "Rank", type: "number", placeholder: "1" },
            { key: "score", label: "Score", type: "number", placeholder: "98" },
          ]}
          columns={[
            { key: "student_name", label: "STUDENT" },
            { key: "exam", label: "EXAM" },
            { key: "rank", label: "RANK" },
            { key: "score", label: "SCORE" },
          ]}
        />
      )}
      {tab === "call-list" && (
        <CrudPage
          title="Toppers Call List"
          subtitle="Toppers to call for testimonials and success stories."
          endpoint="/toppers/call-list"
          itemLabel="Topper"
          searchPlaceholder="Search the call list..."
          allowCreate={false}
          allowEdit={false}
          allowDelete={false}
          fields={[]}
          columns={[
            { key: "student_name", label: "STUDENT" },
            { key: "exam", label: "EXAM" },
            { key: "rank", label: "RANK" },
            { key: "score", label: "SCORE" },
          ]}
        />
      )}
    </div>
  );
}
