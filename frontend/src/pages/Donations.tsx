import { useState } from "react";
import { Check, PackageOpen, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DonateModal } from "@/components/DonateModal";
import { DonationBadge, Empty, ErrorNote, Loading } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { categoryLabel, fmtDateTime, fmtNumber } from "@/lib/labels";
import type { Donation } from "@/types";

export function Donations() {
  const { hasRole } = useAuth();
  return hasRole("admin", "coordinador") ? <ManagerDonations /> : <MyDonations />;
}

/** Vista de donante / voluntario: su historial de donaciones */
function MyDonations() {
  const donations = useLoad(() => api.donations.mine());
  const centers = useLoad(() => api.centers.list());
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState("");

  async function cancel(d: Donation) {
    if (!window.confirm("¿Cancelar esta donación?")) return;
    try { await api.donations.cancel(d.id); void donations.reload(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <AppShell
      title="Mis donaciones"
      subtitle="Lo que has llevado o vas a llevar a los centros"
      actions={<button type="button" className="btn-primary" onClick={() => setDonating(true)}><Plus size={16} /> Nueva donación</button>}
    >
      <div className="page">
        <ErrorNote message={error || donations.error} />
        {donations.loading && !donations.data ? <Loading /> : (donations.data ?? []).length === 0 ? (
          <Empty icon={<PackageOpen size={28} />} title="Aún no has registrado donaciones">
            <p>Revisa las necesidades de los centros y registra lo que vas a llevar.</p>
          </Empty>
        ) : (
          <DonationTable rows={donations.data ?? []} showDonor={false} actions={(d) =>
            d.status === "prometida" && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => cancel(d)}>Cancelar</button>
            )}
          />
        )}
      </div>
      {donating && centers.data && (
        <DonateModal centers={centers.data} onClose={() => setDonating(false)} onDone={() => { setDonating(false); void donations.reload(); }} />
      )}
    </AppShell>
  );
}

/** Vista de coordinador / admin: donaciones que llegan a sus centros */
function ManagerDonations() {
  const [status, setStatus] = useState("prometida");
  const [centerId, setCenterId] = useState("");
  const myCenters = useLoad(() => api.centers.mine());
  const donations = useLoad(
    () => api.donations.list({ status: status || undefined, centerId: centerId ? Number(centerId) : undefined }),
    [status, centerId],
  );
  const [walkIn, setWalkIn] = useState(false);
  const [error, setError] = useState("");

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try { await fn(); void donations.reload(); } catch (e) { setError((e as Error).message); }
  }

  function receive(d: Donation) {
    const answer = window.prompt(`Cantidad recibida de "${d.item}" (${d.unit}):`, String(d.quantity));
    if (answer === null) return;
    const qty = Number(answer.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) { setError("Cantidad inválida"); return; }
    void act(() => api.donations.receive(d.id, qty));
  }

  const TABS = [
    { value: "prometida", label: "Por recibir" },
    { value: "recibida", label: "Recibidas" },
    { value: "cancelada", label: "Canceladas" },
    { value: "", label: "Todas" },
  ];

  return (
    <AppShell
      title="Donaciones"
      subtitle="Confirma lo que llega a tus centros"
      actions={(myCenters.data?.length ?? 0) > 0 && (
        <button type="button" className="btn-primary" onClick={() => setWalkIn(true)}><Plus size={16} /> Registrar entrada</button>
      )}
    >
      <div className="page">
        <div className="filters">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.label} type="button" role="tab" aria-selected={status === t.value}
                className={`tab${status === t.value ? " active" : ""}`} onClick={() => setStatus(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          <select className="form-select" value={centerId} onChange={(e) => setCenterId(e.target.value)} aria-label="Centro">
            <option value="">Todos mis centros</option>
            {(myCenters.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <ErrorNote message={error || donations.error} />
        {donations.loading && !donations.data ? <Loading /> : (donations.data ?? []).length === 0 ? (
          <Empty icon={<PackageOpen size={28} />} title="No hay donaciones en esta vista" />
        ) : (
          <DonationTable rows={donations.data ?? []} showDonor actions={(d) =>
            d.status === "prometida" && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => receive(d)}><Check size={14} /> Recibida</button>
                <button type="button" className="icon-btn danger" title="Cancelar" onClick={() => { if (window.confirm("¿Cancelar esta donación?")) void act(() => api.donations.cancel(d.id)); }}>
                  <X size={16} />
                </button>
              </>
            )}
          />
        )}
      </div>
      {walkIn && myCenters.data && (
        <DonateModal walkIn centers={myCenters.data} onClose={() => setWalkIn(false)} onDone={() => { setWalkIn(false); void donations.reload(); }} />
      )}
    </AppShell>
  );
}

function DonationTable({
  rows, showDonor, actions,
}: { rows: Donation[]; showDonor: boolean; actions: (d: Donation) => React.ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Donación</th>
            <th className="num">Cantidad</th>
            <th>Centro</th>
            {showDonor && <th>Donante</th>}
            <th>Estado</th>
            <th>Fecha</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                <b>{d.item}</b>
                <small className="block muted">{categoryLabel(d.category)}{d.notes ? ` · ${d.notes}` : ""}</small>
              </td>
              <td className="num">{fmtNumber(d.quantity)} {d.unit}</td>
              <td>{d.center_name}</td>
              {showDonor && <td>{d.donor_display}{d.donor_email && <small className="block muted">{d.donor_email}</small>}</td>}
              <td><DonationBadge status={d.status} /></td>
              <td className="muted nowrap">
                {fmtDateTime(d.received_at ?? d.created_at)}
                {d.received_by_name && <small className="block">Recibió: {d.received_by_name}</small>}
              </td>
              <td className="row-actions">{actions(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
