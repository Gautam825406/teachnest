"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, type Category, type Subcategory } from "@/lib/api";
import { Button, Card, ErrorBox, Input, Loading, PageHeader, Select } from "@/components/ui";

export default function CategoriesPage() {
  const [tab, setTab] = useState<"category" | "subcategory">("category");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, subs] = await Promise.all([
        apiFetch<Category[]>("/course-categories"),
        apiFetch<Subcategory[]>("/course-subcategories"),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSubcategories(Array.isArray(subs) ? subs : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load categories."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function startEdit(id: string, currentName: string, parent?: string) {
    setEditingId(id); setName(currentName); if (parent) setParentId(parent);
  }
  function resetForm() { setEditingId(null); setName(""); setParentId(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (tab === "category") {
        if (editingId) await apiFetch(`/course-categories/${editingId}`, { method: "PUT", body: JSON.stringify({ name }) });
        else await apiFetch("/course-categories", { method: "POST", body: JSON.stringify({ name }) });
      } else {
        const body = { name, category_id: Number(parentId) || parentId };
        if (editingId) await apiFetch(`/course-subcategories/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
        else await apiFetch("/course-subcategories", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm(); load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
  }

  async function remove(id: string | number) {
    if (!confirm("Delete this item?")) return;
    try {
      await apiFetch(tab === "category" ? `/course-categories/${id}` : `/course-subcategories/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete."); }
  }

  const list = tab === "category" ? categories : subcategories;

  return (
    <div>
      <PageHeader title="Course Categories" subtitle="Organise courses into categories and subcategories." />
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "category" ? "primary" : "secondary"} onClick={() => { setTab("category"); resetForm(); }}>Course Category</Button>
        <Button variant={tab === "subcategory" ? "primary" : "secondary"} onClick={() => { setTab("subcategory"); resetForm(); }}>Course Sub Category</Button>
      </div>
      <ErrorBox message={error} />
      <Card className="mb-6 p-4">
        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="mb-1 block text-sm font-medium">{tab === "category" ? "Category Name" : "Sub Category Name"}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder={tab === "category" ? "e.g. Science" : "e.g. Physics"} />
          </div>
          {tab === "subcategory" && (
            <div className="min-w-64 flex-1">
              <label className="mb-1 block text-sm font-medium">Parent Category</label>
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)} required>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
              </Select>
            </div>
          )}
          <Button type="submit">{editingId ? "Update" : "Add"}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
        </form>
      </Card>
      {loading ? <Loading /> : (
        <Card className="divide-y divide-slate-200 dark:divide-slate-800">
          {list.length === 0 && <p className="p-4 text-sm text-slate-500">No {tab === "category" ? "categories" : "subcategories"} yet.</p>}
          {list.map((item) => (
            <div key={String(item.id)} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-slate-500">
                  ID: {String(item.id)}
                  {tab === "subcategory" && ` • Category: ${categories.find((c) => String(c.id) === String((item as Subcategory).category_id))?.name || (item as Subcategory).category_id}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => startEdit(String(item.id), item.name, tab === "subcategory" ? String((item as Subcategory).category_id) : undefined)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(item.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
