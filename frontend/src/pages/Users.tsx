import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorNote, Loading } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { ROLE_LABELS, fmtDateTime } from "@/lib/labels";
import type { AdminUser, Role } from "@/types";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function Users() {
  const { user: me } = useAuth();
  const users = useLoad(() => api.users.list());
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  async function update(u: AdminUser, data: { role?: Role; is_active?: boolean }) {
    setError("");
    try {
      const updated = await api.users.update(u.id, data);
      users.setData((list) => (list ?? []).map((x) => (x.id === u.id ? updated : x)));
    } catch (e) { setError((e as Error).message); }
  }

  const rows = (users.data ?? []).filter((u) => !filter || u.role === filter);

  return (
    <AppShell title="Usuarios" subtitle="Asigna roles y gestiona el acceso">
      <div className="page">
        <div className="filters">
          <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Rol">
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="muted small">Para que alguien coordine un centro, cámbiale el rol a <b>Coordinador</b> y asígnalo desde la vista de Centros.</p>
        </div>
        <ErrorNote message={error || users.error} />
        {users.loading && !users.data ? <Loading /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id} className={u.is_active ? "" : "row-muted"}>
                      <td><b>{u.name}</b>{self && <span className="badge badge-media ml">Tú</span>}</td>
                      <td>{u.email}</td>
                      <td>{u.phone ?? "—"}</td>
                      <td>
                        <select className="form-select compact" value={u.role} disabled={self}
                          onChange={(e) => update(u, { role: e.target.value as Role })} aria-label={`Rol de ${u.name}`}>
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td>
                        <label className="check">
                          <input type="checkbox" checked={Boolean(u.is_active)} disabled={self}
                            onChange={(e) => update(u, { is_active: e.target.checked })} />
                          {u.is_active ? "Activo" : "Inactivo"}
                        </label>
                      </td>
                      <td className="muted nowrap">{fmtDateTime(u.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
