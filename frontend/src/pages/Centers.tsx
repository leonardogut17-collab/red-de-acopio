import { useMemo, useState } from "react";
import { Clock, MapPin, Pencil, Phone, Plus, Search, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CentersMap, LocationPicker } from "@/components/CentersMap";
import { DonateModal } from "@/components/DonateModal";
import { Empty, ErrorNote, Modal, PriorityBadge } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { categoryLabel, fmtNumber, plural } from "@/lib/labels";
import type { AdminUser, Center } from "@/types";

export function Centers() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const isManager = hasRole("admin", "coordinador");

  const centers = useLoad(() => api.centers.list(isAdmin), [isAdmin]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detail = useLoad(() => (selectedId ? api.centers.get(selectedId) : Promise.resolve(null)), [selectedId]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Center | "new" | null>(null);
  const [donating, setDonating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (centers.data ?? []).filter((c) => !q || `${c.name} ${c.address}`.toLowerCase().includes(q));
  }, [centers.data, query]);

  const c = detail.data;

  async function remove(center: Center) {
    if (!window.confirm(`¿Eliminar "${center.name}"? Se borrarán también sus necesidades, donaciones y turnos.`)) return;
    try {
      await api.centers.remove(center.id);
      setSelectedId(null);
      void centers.reload();
    } catch (e) { window.alert((e as Error).message); }
  }

  return (
    <AppShell
      title="Centros de acopio"
      subtitle={`${centers.data?.length ?? 0} centros en la red`}
      bleed
      actions={isAdmin && (
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> Nuevo centro
        </button>
      )}
    >
      <div className="split-view">
        <aside className="side-panel">
          {!c ? (
            <>
              <div className="search-box">
                <Search size={16} />
                <input placeholder="Buscar por nombre o dirección" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <ErrorNote message={centers.error} />
              <ul className="center-list">
                {filtered.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setSelectedId(x.id)}>
                      <MapPin size={18} className={x.urgent_needs ? "urgent" : ""} />
                      <span>
                        <b>{x.name}{!x.is_active && <em className="inactive"> (inactivo)</em>}</b>
                        <small>{x.address}</small>
                        <small className="muted">{plural(x.open_needs, "necesidad abierta", "necesidades abiertas")}{x.urgent_needs ? ` · ${plural(x.urgent_needs, "urgente", "urgentes")}` : ""}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {!centers.loading && filtered.length === 0 && <Empty title="No hay centros que coincidan" />}
            </>
          ) : (
            <div className="center-detail">
              <button type="button" className="link back" onClick={() => setSelectedId(null)}>← Todos los centros</button>
              <h2>{c.name}</h2>
              {!c.is_active && <p className="alert">Este centro está inactivo y no aparece en el sitio público.</p>}
              {c.description && <p className="muted">{c.description}</p>}
              <ul className="facts">
                <li><MapPin size={15} /> {c.address}, {c.city}</li>
                {c.schedule && <li><Clock size={15} /> {c.schedule}</li>}
                {c.phone && <li><Phone size={15} /> <a href={`tel:${c.phone}`}>{c.phone}</a></li>}
                <li><UserRound size={15} /> {c.coordinator_name ? `Coordina: ${c.coordinator_name}` : "Sin coordinador asignado"}</li>
              </ul>

              <div className="detail-actions">
                {!isManager && c.is_active && (
                  <button type="button" className="btn btn-primary" onClick={() => setDonating(true)}>Donar a este centro</button>
                )}
                {c.can_manage && (
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(c)}><Pencil size={15} /> Editar</button>
                )}
                {isAdmin && (
                  <button type="button" className="btn btn-danger" onClick={() => remove(c)}><Trash2 size={15} /> Eliminar</button>
                )}
              </div>

              <h3 className="detail-sub">Necesidades abiertas</h3>
              {c.needs.length === 0 ? (
                <p className="muted">Este centro no tiene necesidades abiertas.</p>
              ) : (
                <ul className="mini-list">
                  {c.needs.map((n) => (
                    <li key={n.id}>
                      <div>
                        <b>{n.item}</b>
                        <span>{categoryLabel(n.category)} · {fmtNumber(n.quantity)} {n.unit}</span>
                      </div>
                      <PriorityBadge priority={n.priority} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        <div className="map-area">
          <CentersMap
            centers={filtered}
            selectedId={selectedId}
            onSelect={(x) => setSelectedId(x.id)}
            className="leaflet-fill"
          />
        </div>
      </div>

      {editing && (
        <CenterForm
          center={editing === "new" ? null : editing}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            void centers.reload();
            if (selectedId === saved.id) void detail.reload(); else setSelectedId(saved.id);
          }}
        />
      )}

      {donating && c && (
        <DonateModal
          centers={centers.data ?? []}
          preset={{ center_id: c.id }}
          onClose={() => setDonating(false)}
          onDone={() => setDonating(false)}
        />
      )}
    </AppShell>
  );
}

function CenterForm({
  center, isAdmin, onClose, onSaved,
}: { center: Center | null; isAdmin: boolean; onClose: () => void; onSaved: (c: Center) => void }) {
  const [form, setForm] = useState({
    name: center?.name ?? "",
    address: center?.address ?? "",
    city: center?.city ?? "Bogotá",
    phone: center?.phone ?? "",
    schedule: center?.schedule ?? "",
    description: center?.description ?? "",
    coordinator_id: center?.coordinator_id ? String(center.coordinator_id) : "",
    is_active: center ? Boolean(center.is_active) : true,
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    center ? { lat: center.latitude, lng: center.longitude } : null,
  );
  const coordinators = useLoad<AdminUser[]>(
    () => (isAdmin ? api.users.list().then((u) => u.filter((x) => ["coordinador", "admin"].includes(x.role) && x.is_active)) : Promise.resolve([])),
    [isAdmin],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) { setError("Haz clic en el mapa para ubicar el centro"); return; }
    setSaving(true);
    const data = {
      name: form.name,
      address: form.address,
      city: form.city,
      phone: form.phone,
      schedule: form.schedule,
      description: form.description,
      latitude: coords.lat,
      longitude: coords.lng,
      ...(isAdmin ? { coordinator_id: form.coordinator_id ? Number(form.coordinator_id) : null, is_active: form.is_active } : {}),
    };
    try {
      onSaved(center ? await api.centers.update(center.id, data) : await api.centers.create(data));
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={center ? "Editar centro" : "Nuevo centro de acopio"} onClose={onClose} wide>
      <ErrorNote message={error} />
      <form onSubmit={submit} className="form-grid">
        <div className="form-group span-2">
          <label className="form-label" htmlFor="c-name">Nombre</label>
          <input id="c-name" className="form-input" value={form.name} onChange={set("name")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="c-addr">Dirección</label>
          <input id="c-addr" className="form-input" value={form.address} onChange={set("address")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="c-city">Ciudad</label>
          <input id="c-city" className="form-input" value={form.city} onChange={set("city")} />
        </div>
        <div className="form-group span-2">
          <span className="form-label">Ubicación en el mapa {coords && <small className="muted">({coords.lat}, {coords.lng})</small>}</span>
          <LocationPicker value={coords} onChange={(lat, lng) => setCoords({ lat, lng })} />
          <small className="form-hint">Haz clic en el mapa para marcar dónde queda el centro.</small>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="c-phone">Teléfono</label>
          <input id="c-phone" className="form-input" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="c-sched">Horario</label>
          <input id="c-sched" className="form-input" value={form.schedule} onChange={set("schedule")} placeholder="Lun a Vie, 8:00 a.m. – 5:00 p.m." />
        </div>
        <div className="form-group span-2">
          <label className="form-label" htmlFor="c-desc">Descripción</label>
          <textarea id="c-desc" className="form-input" rows={2} value={form.description} onChange={set("description")} />
        </div>
        {isAdmin && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="c-coord">Coordinador</label>
              <select id="c-coord" className="form-select" value={form.coordinator_id} onChange={set("coordinator_id")}>
                <option value="">Sin asignar</option>
                {(coordinators.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="form-group">
              <span className="form-label">Estado</span>
              <label className="check">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Centro activo
              </label>
            </div>
          </>
        )}
        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}
