import { useState } from "react";
import { CheckCircle2, ListChecks, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DonateModal } from "@/components/DonateModal";
import { Empty, ErrorNote, Loading, Modal, PriorityBadge } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { CATEGORIES, UNITS, categoryLabel, fmtDateTime, fmtNumber } from "@/lib/labels";
import type { Category, Center, Need, Priority } from "@/types";

export function Needs() {
  const { hasRole } = useAuth();
  const isManager = hasRole("admin", "coordinador");

  const [centerId, setCenterId] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("abierta");

  const centers = useLoad(() => api.centers.list());
  const myCenters = useLoad(() => (isManager ? api.centers.mine() : Promise.resolve([] as Center[])), [isManager]);
  const needs = useLoad(
    () => api.needs.list({ centerId: centerId ? Number(centerId) : undefined, category, status }),
    [centerId, category, status],
  );

  const [editing, setEditing] = useState<Need | "new" | null>(null);
  const [donating, setDonating] = useState<Need | null>(null);
  const [error, setError] = useState("");

  const managedIds = new Set((myCenters.data ?? []).map((c) => c.id));

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try { await fn(); void needs.reload(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <AppShell
      title="Necesidades"
      subtitle="Lo que cada centro necesita recibir"
      actions={isManager && (myCenters.data?.length ?? 0) > 0 && (
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> Nueva necesidad
        </button>
      )}
    >
      <div className="page">
        <div className="filters">
          <select className="form-select" value={centerId} onChange={(e) => setCenterId(e.target.value)} aria-label="Centro">
            <option value="">Todos los centros</option>
            {(centers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {isManager && (
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
              <option value="abierta">Abiertas</option>
              <option value="cubierta">Cubiertas</option>
              <option value="todas">Todas</option>
            </select>
          )}
        </div>

        <ErrorNote message={error || needs.error} />

        {needs.loading && !needs.data ? <Loading /> : (needs.data ?? []).length === 0 ? (
          <Empty icon={<ListChecks size={28} />} title="No hay necesidades con estos filtros" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Categoría</th>
                  <th className="num">Cantidad</th>
                  <th>Centro</th>
                  <th>Prioridad</th>
                  {isManager && <th>Publicada</th>}
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {(needs.data ?? []).map((n) => (
                  <tr key={n.id} className={n.status === "cubierta" ? "row-muted" : ""}>
                    <td><b>{n.item}</b>{n.status === "cubierta" && <span className="badge badge-recibida ml">Cubierta</span>}</td>
                    <td>{categoryLabel(n.category)}</td>
                    <td className="num">{fmtNumber(n.quantity)} {n.unit}</td>
                    <td>{n.center_name}</td>
                    <td><PriorityBadge priority={n.priority} /></td>
                    {isManager && <td className="muted nowrap">{fmtDateTime(n.created_at)}</td>}
                    <td className="row-actions">
                      {!isManager && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setDonating(n)}>Donar</button>
                      )}
                      {isManager && managedIds.has(n.center_id) && (
                        <>
                          {n.status === "abierta" ? (
                            <button type="button" className="icon-btn" title="Marcar como cubierta" onClick={() => act(() => api.needs.update(n.id, { status: "cubierta" }))}>
                              <CheckCircle2 size={17} />
                            </button>
                          ) : (
                            <button type="button" className="icon-btn" title="Reabrir" onClick={() => act(() => api.needs.update(n.id, { status: "abierta" }))}>
                              <RotateCcw size={17} />
                            </button>
                          )}
                          <button type="button" className="icon-btn" title="Editar" onClick={() => setEditing(n)}><Pencil size={16} /></button>
                          <button type="button" className="icon-btn danger" title="Eliminar" onClick={() => { if (window.confirm("¿Eliminar esta necesidad?")) void act(() => api.needs.remove(n.id)); }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <NeedForm
          need={editing === "new" ? null : editing}
          centers={myCenters.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void needs.reload(); }}
        />
      )}
      {donating && centers.data && (
        <DonateModal
          centers={centers.data}
          preset={{ center_id: donating.center_id, category: donating.category, item: donating.item, unit: donating.unit }}
          onClose={() => setDonating(null)}
          onDone={() => setDonating(null)}
        />
      )}
    </AppShell>
  );
}

function NeedForm({
  need, centers, onClose, onSaved,
}: { need: Need | null; centers: Center[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    center_id: String(need?.center_id ?? centers[0]?.id ?? ""),
    category: (need?.category ?? "alimentos") as Category,
    item: need?.item ?? "",
    quantity: need ? String(need.quantity) : "",
    unit: need?.unit ?? "unidades",
    priority: (need?.priority ?? "media") as Priority,
  });
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form, center_id: Number(form.center_id), quantity: Number(form.quantity) };
    try {
      if (need) await api.needs.update(need.id, data); else await api.needs.create(data);
      onSaved();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <Modal title={need ? "Editar necesidad" : "Nueva necesidad"} onClose={onClose}>
      <ErrorNote message={error} />
      <form onSubmit={submit} className="form-grid">
        <div className="form-group span-2">
          <label className="form-label" htmlFor="n-center">Centro</label>
          <select id="n-center" className="form-select" value={form.center_id} onChange={set("center_id")} disabled={!!need}>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="n-cat">Categoría</label>
          <select id="n-cat" className="form-select" value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="n-item">Insumo</label>
          <input id="n-item" className="form-input" value={form.item} onChange={set("item")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="n-qty">Cantidad</label>
          <input id="n-qty" type="number" min="0.01" step="any" className="form-input" value={form.quantity} onChange={set("quantity")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="n-unit">Unidad</label>
          <select id="n-unit" className="form-select" value={form.unit} onChange={set("unit")}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="form-group span-2">
          <label className="form-label" htmlFor="n-prio">Prioridad</label>
          <select id="n-prio" className="form-select" value={form.priority} onChange={set("priority")}>
            <option value="alta">Urgente</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
