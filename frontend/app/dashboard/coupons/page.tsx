"use client";
import { useState } from "react";
import CrudPage from "@/components/CrudPage";
import { Button } from "@/components/ui";

export default function CouponsPage() {
  const [tab, setTab] = useState<"all" | "applied">("all");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === "all" ? "primary" : "secondary"} onClick={() => setTab("all")}>All Coupons</Button>
        <Button variant={tab === "applied" ? "primary" : "secondary"} onClick={() => setTab("applied")}>Applied Coupons</Button>
      </div>
      {tab === "all" && (
        <CrudPage
          title="Discounts & Coupons"
          subtitle="Create discount coupons for your courses and bundles."
          endpoint="/coupons"
          itemLabel="Coupon"
          searchPlaceholder="Search coupons..."
          fields={[
            { key: "code", label: "Coupon Code", required: true, placeholder: "e.g. WELCOME50" },
            { key: "discount_percent", label: "Discount (%)", type: "number", required: true, placeholder: "50" },
            { key: "max_discount", label: "Max Discount (Rs.)", type: "number", placeholder: "500" },
            { key: "valid_from", label: "Valid From", type: "date" },
            { key: "valid_to", label: "Valid To", type: "date" },
            { key: "is_active", label: "Active", type: "checkbox" },
          ]}
          columns={[
            { key: "code", label: "CODE" },
            { key: "discount_percent", label: "DISCOUNT (%)" },
            { key: "max_discount", label: "MAX DISCOUNT", format: "inr" },
            { key: "valid_from", label: "VALID FROM", format: "date" },
            { key: "valid_to", label: "VALID TO", format: "date" },
            { key: "is_active", label: "ACTIVE", format: "bool" },
          ]}
        />
      )}
      {tab === "applied" && (
        <CrudPage
          title="Applied Coupons"
          subtitle="Coupons students have applied to their orders."
          endpoint="/coupons/applied"
          itemLabel="Applied Coupon"
          searchPlaceholder="Search applied coupons..."
          allowCreate={false}
          allowEdit={false}
          allowDelete={false}
          fields={[]}
          columns={[
            { key: "code", label: "CODE" },
            { key: "student_name", label: "STUDENT" },
            { key: "discount", label: "DISCOUNT", format: "inr" },
            { key: "created_at", label: "APPLIED AT", format: "date" },
          ]}
        />
      )}
    </div>
  );
}
