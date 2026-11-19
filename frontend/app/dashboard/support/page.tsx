"use client";
import { useState } from "react";
import CrudPage from "@/components/CrudPage";
import { Button } from "@/components/ui";

export default function SupportPage() {
  const [tab, setTab] = useState<"enquiries" | "types">("enquiries");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === "enquiries" ? "primary" : "secondary"} onClick={() => setTab("enquiries")}>Enquiries</Button>
        <Button variant={tab === "types" ? "primary" : "secondary"} onClick={() => setTab("types")}>Enquiry Types</Button>
      </div>
      {tab === "enquiries" && (
        <CrudPage
          title="Help & Support"
          subtitle="Enquiries sent by students and visitors."
          endpoint="/enquiries"
          itemLabel="Enquiry"
          searchPlaceholder="Search enquiries..."
          fields={[
            { key: "name", label: "Name", required: true, placeholder: "Your name" },
            { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { key: "phone", label: "Phone", type: "tel", placeholder: "10-digit mobile number" },
            { key: "enquiry_type_id", label: "Enquiry Type", type: "select", optionsEndpoint: "/enquiry-types", optionsLabelKey: "name" },
            { key: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "in_progress", label: "In Progress" }, { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" }] },
            { key: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?" },
          ]}
          columns={[
            { key: "name", label: "NAME" },
            { key: "email", label: "EMAIL" },
            { key: "phone", label: "PHONE" },
            { key: "message", label: "MESSAGE" },
            { key: "status", label: "STATUS", format: "badge" },
          ]}
        />
      )}
      {tab === "types" && (
        <CrudPage
          title="Enquiry Types"
          subtitle="Categories students can choose when sending an enquiry."
          endpoint="/enquiry-types"
          itemLabel="Enquiry Type"
          searchPlaceholder="Search enquiry types..."
          fields={[{ key: "name", label: "Type Name", required: true, placeholder: "e.g. Course Fee" }]}
          columns={[{ key: "name", label: "NAME" }]}
        />
      )}
    </div>
  );
}
