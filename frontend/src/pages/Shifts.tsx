import { useState } from "react";
import { CalendarClock, Clock, MapPin, Plus, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty, ErrorNote, Loading, Modal } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { fmtDay, fmtTime } from "@/lib/labels";
import type { Center, Shift } from "@/types";

export function Shifts() {
  const { hasRole } = useAuth();
  const isManager = hasRole("admin", "coordinador");
  const isVolunteer = hasRole("voluntario");

  const [centerId, setCenterId] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const centers = useLoad(() => api.centers.list());
  const myCenters = useLoad(() => (isManager ? api.centers.mine() : Promise.resolve([] as Center[])), [isManager]);
  const shifts = useLoad(
    () => (onlyMine ? api.shifts.mine() : api.shifts.list({ centerId: centerId ? Number(centerId) : undefined })),
    [centerId, onlyMine],
  );
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Shift | null>(null);
  const [error, setError] = useState("");

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try { await fn(); void shifts.reload(); } catch (e) { setError((e as Error).message); }
  }

  // Agrupa los turnos por fecha
  const groups = (shifts.data ?? []).reduce<Record<string, Shift[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  return (
    <AppShell
      title="Turnos de voluntariado"
      subtitle={isVolunteer ? "Inscríbete en los turnos que puedas cubrir" : "Organiza a los voluntarios de tus centros"}
      actions={isManager && (myCenters.data?.length ?? 0) > 0 && (
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nuevo turno</button>
      )}
    >
      <div className="page">
        <div className="filters">
          <select className="form-select" value={centerId} onChange={(e) => setCenterId(e.target.value)} aria-label="Centro" disabled={onlyMine}>
            <option value="">Todos los centros</option>
            {(centers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isVolunteer && (
            <label className="check">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Solo mis turnos
            </label>
          )}
        </div>
        <ErrorNote message={error || shifts.error} />

        {shifts.loading && !shifts.data ? <Loading /> : Object.keys(groups).length === 0 ? (
          <Empty icon={<CalendarClock size={28} />} title={onlyMine ? "No estás inscrito en ningún turno" : "No hay turnos programados"} />
        ) : (
          Object.entries(groups).map(([date, list]) => (
            <section key={date} className="day-group">
              <h2 className="day-title">{fmtDay(date)}</h2>
              <div className="shift-grid">
                {list.map((s) => {
                  const full = s.signed_up >= s.slots;
                  return (
                    <article key={s.id} className={`shift-card${s.is_signed_up ? " joined" : ""}`}>
                      <h3>{s.title}</h3>
                      {s.description && <p className="muted">{s.description}</p>}
                      <ul className="facts">
                        <li><Clock size={14} /> {fmtTime(s.start_time)} – {fmtTime(s.end_time)}</li>
                        <li><MapPin size={14} /> {s.center_name}</li>
                      </ul>
                      <div className="slots">
                        <div className="slots-bar"><span style={{ width: `${Math.min(100, (s.signed_up / s.slots) * 100)}%` }} /></div>
                        <small>{s.signed_up} de {s.slots} cupos</small>
                      </div>
                      <div className="shift-actions">
                        {isVolunteer && (s.is_signed_up ? (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => act(() => api.shifts.cancel(s.id))}>Cancelar inscripción</button>
                        ) : (
                          <button type="button" className="btn btn-primary btn-sm" disabled={full} onClick={() => act(() => api.shifts.signUp(s.id))}>
                            {full ? "Sin cupos" : "Inscribirme"}
                          </button>
                        ))}
                        {s.can_manage && (
                          <>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewing(s)}><Users size={14} /> Voluntarios</button>
                            <button type="button" className="icon-btn danger" title="Eliminar turno" onClick={() => { if (window.confirm("¿Eliminar este turno?")) void act(() => api.shifts.remove(s.id)); }}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {creating && (
        <ShiftForm centers={myCenters.data ?? []} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void shifts.reload(); }} />
      )}
      {viewing && <VolunteersModal shift={viewing} onClose={() => setViewing(null)} />}
    </AppShell>
  );
}

function ShiftForm({ centers, onClose, onSaved }: { centers: Center[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    center_id: String(centers[0]?.id ?? ""), title: "", description: "",
    date: today, start_time: "08:00", end_time: "12:00", slots: "5",
  });
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.shifts.create({ ...form, center_id: Number(form.center_id), slots: Number(form.slots) });
      onSaved();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <Modal title="Nuevo turno" onClose={onClose}>
      <ErrorNote message={error} />
      <form onSubmit={submit} className="form-grid">
        <div className="form-group span-2">
          <label className="form-label" htmlFor="s-center">Centro</label>
          <select id="s-center" className="form-select" value={form.center_id} onChange={set("center_id")}>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group span-2">
          <label className="form-label" htmlFor="s-title">Actividad</label>
          <input id="s-title" className="form-input" value={form.title} onChange={set("title")} required placeholder="Ej. Clasificación de alimentos" />
        </div>
        <div className="form-group span-2">
          <label className="form-label" htmlFor="s-desc">Descripción (opcional)</label>
          <input id="s-desc" className="form-input" value={form.description} onChange={set("description")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="s-date">Fecha</label>
          <input id="s-date" type="date" min={today} className="form-input" value={form.date} onChange={set("date")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="s-slots">Cupos</label>
          <input id="s-slots" type="number" min="1" className="form-input" value={form.slots} onChange={set("slots")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="s-start">Inicio</label>
          <input id="s-start" type="time" className="form-input" value={form.start_time} onChange={set("start_time")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="s-end">Fin</label>
          <input id="s-end" type="time" className="form-input" value={form.end_time} onChange={set("end_time")} required />
        </div>
        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Crear turno</button>
        </div>
      </form>
    </Modal>
  );
}

function VolunteersModal({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const volunteers = useLoad(() => api.shifts.volunteers(shift.id), [shift.id]);
  return (
    <Modal title={`Voluntarios · ${shift.title}`} onClose={onClose}>
      <ErrorNote message={volunteers.error} />
      {volunteers.loading ? <Loading /> : (volunteers.data ?? []).length === 0 ? (
        <Empty title="Nadie se ha inscrito todavía" />
      ) : (
        <ul className="mini-list">
          {(volunteers.data ?? []).map((v) => (
            <li key={v.id}>
              <div>
                <b>{v.name}</b>
                <span>{v.email}{v.phone ? ` · ${v.phone}` : ""}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
