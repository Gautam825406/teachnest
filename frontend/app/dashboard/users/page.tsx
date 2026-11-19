"use client";
import CrudPage from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Users"
      subtitle="Manage admin panel users and their roles."
      endpoint="/users"
      itemLabel="User"
      searchPlaceholder="Search users..."
      fields={[
        { key: "username", label: "Username", required: true, placeholder: "e.g. admin2" },
        { key: "email", label: "Email", type: "email", required: true, placeholder: "user@example.com" },
        { key: "password", label: "Password", placeholder: "Set a password (required for new users)", hint: "Leave blank when editing to keep the current password." },
        { key: "role", label: "Role", type: "select", options: [{ value: "admin", label: "Admin" }, { value: "super_admin", label: "Super Admin" }, { value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }] },
      ]}
      columns={[
        { key: "username", label: "USERNAME" },
        { key: "email", label: "EMAIL" },
        { key: "role", label: "ROLE", format: "badge" },
      ]}
    />
  );
}
