"use client";
import CrudPage from "@/components/CrudPage";
import MiniManager from "@/components/MiniManager";

export default function EbooksPage() {
  return (
    <div className="space-y-6">
      <CrudPage
        title="E-Books"
        subtitle="Sell e-books to your students."
        endpoint="/ebooks"
        itemLabel="E-Book"
        searchPlaceholder="Search e-books..."
        fields={[
          { key: "title", label: "Title", required: true, placeholder: "e.g. Complete Mathematics Guide" },
          { key: "author_id", label: "Author", type: "select", optionsEndpoint: "/authors", optionsLabelKey: "name" },
          { key: "ebook_type_id", label: "E-Book Type", type: "select", optionsEndpoint: "/ebook-types", optionsLabelKey: "name" },
          { key: "price", label: "Price (Rs.)", type: "number", placeholder: "199" },
          { key: "file_url", label: "E-Book File (PDF)", type: "file", accept: "application/pdf", hint: "Upload the e-book PDF." },
          { key: "cover_url", label: "Cover Image", type: "file", accept: "image/jpeg,image/png,image/webp", hint: "Upload the cover image." },
        ]}
        columns={[
          { key: "title", label: "TITLE" },
          { key: "price", label: "PRICE", format: "inr" },
          { key: "file_url", label: "FILE", format: "link" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <MiniManager
          title="E-Book Types"
          endpoint="/ebook-types"
          itemLabel="E-Book Type"
          displayKeys={["name"]}
          fields={[{ key: "name", label: "Type Name", required: true, placeholder: "e.g. Guide" }]}
        />
        <MiniManager
          title="Authors"
          endpoint="/authors"
          itemLabel="Author"
          displayKeys={["name", "bio"]}
          fields={[
            { key: "name", label: "Author Name", required: true, placeholder: "e.g. R. K. Sharma" },
            { key: "bio", label: "Bio", type: "textarea", placeholder: "Short biography..." },
          ]}
        />
        <MiniManager
          title="E-Book Banners"
          endpoint="/ebook-banners"
          itemLabel="E-Book Banner"
          displayKeys={["title", "status"]}
          fields={[
            { key: "title", label: "Title", required: true, placeholder: "e.g. Bestseller E-Books" },
            { key: "image_url", label: "Banner Image", type: "file", accept: "image/jpeg,image/png,image/webp" },
            { key: "weight", label: "Weight", type: "number", placeholder: "0" },
            { key: "status", label: "Status", type: "select", options: [{ value: "ACTIVE", label: "ACTIVE" }, { value: "INACTIVE", label: "INACTIVE" }] },
          ]}
        />
      </div>
    </div>
  );
}
