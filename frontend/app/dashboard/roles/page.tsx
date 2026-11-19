"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, type Role } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, PageHeader } from "@/components/ui";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Role[] | { items: Role[] }>("/roles");
      setRoles(Array.isArray(data) ? data : data.items || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load roles."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setName(""); setPermissions([]); setFormError(null); setModalOpen(true); }
  function openEdit(r: Role) { setEditing(r); setName(r.name); setPermissions(r.permissions || []); setFormError(null); setModalOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFormError(null);
    try {
      if (editing) await apiFetch(`/roles/${editing.id}`, { method: "PUT", body: JSON.stringify({ name, permissions }) });
      else await apiFetch("/roles", { method: "POST", body: JSON.stringify({ name, permissions }) });
      setModalOpen(false); load();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not save the role."); }
    finally { setBusy(false); }
  }

  async function remove(r: Role) {
    if (r.is_system_default) return;
    if (!confirm(`Delete role ${r.name}?`)) return;
    try { await apiFetch(`/roles/${r.id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete the role."); }
  }

  return (
    <div>
      <PageHeader title="User Roles" subtitle="Create roles and control exactly what each role can do." actions={<Button onClick={openCreate}>+ Create Role</Button>} />
      <ErrorBox message={error} />
      {loading ? <Loading /> : roles.length === 0 ? (
        <EmptyState title="No roles yet" subtitle="Create your first role." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {roles.map((r) => (
            <Card key={String(r.id)} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.is_system_default ? <Badge tone="indigo">System Default</Badge> : <Badge>Custom Role</Badge>}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{(r.permissions || []).length} permissions</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{(r.permissions || []).join(", ")}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                  <Button variant="danger" onClick={() => remove(r)} disabled={!!r.is_system_default} title={r.is_system_default ? "System default roles cannot be deleted" : undefined}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Role" : "Create Role"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Role Name" required><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Teacher" /></Field>
          <div>
            <p className="mb-2 text-sm font-medium">Permissions ({PERMISSIONS.length})</p>
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-300 p-3 sm:grid-cols-2 dark:border-slate-700">
              {PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={permissions.includes(p)} onChange={() => setPermissions(permissions.includes(p) ? permissions.filter((x) => x !== p) : [...permissions, p])} className="h-4 w-4 accent-indigo-600" />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <ErrorBox message={formError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Update Role" : "Create Role"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
