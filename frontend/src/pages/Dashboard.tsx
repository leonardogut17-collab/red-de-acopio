import { useState } from "react";
import { ArrowRight, CalendarClock, ListChecks, MapPinned, PackageOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { CentersMap } from "@/components/CentersMap";
import { DonateModal } from "@/components/DonateModal";
import { DonationBadge, Empty, PriorityBadge } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { categoryLabel, fmtDay, fmtNumber, fmtTime, plural } from "@/lib/labels";
import type { Need } from "@/types";

export function Dashboard() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole("admin", "coordinador");
  const isVolunteer = hasRole("voluntario");

  const stats = useLoad(() => api.stats());
  const centers = useLoad(() => api.centers.list());
  const needs = useLoad(() => api.needs.list());
  const myDonations = useLoad(() => (isManager ? Promise.resolve([]) : api.donations.mine()), [isManager]);
  const pending = useLoad(() => (isManager ? api.donations.list({ status: "prometida" }) : Promise.resolve([])), [isManager]);
  const myShifts = useLoad(() => (isVolunteer ? api.shifts.mine() : Promise.resolve([])), [isVolunteer]);

  const [donate, setDonate] = useState<Need | null | "new">(null);

  const s = stats.data;
  const firstName = user?.name.split(" ")[0] ?? "";
  const urgentNeeds = (needs.data ?? []).filter((n) => n.priority === "alta").slice(0, 5);
  const upcomingShifts = (myShifts.data ?? []).filter((x) => x.date >= new Date().toISOString().slice(0, 10));

  const tiles = [
    { label: "Centros activos", value: s?.centers, Icon: MapPinned, to: "/app/centros" },
    { label: "Necesidades abiertas", value: s?.openNeeds, sub: s ? plural(s.urgentNeeds, "urgente", "urgentes") : "", Icon: ListChecks, to: "/app/necesidades", tone: "coral" },
    { label: isManager ? "Donaciones por recibir" : "Donaciones recibidas", value: isManager ? s?.donationsPending : s?.donationsReceived, Icon: PackageOpen, to: "/app/donaciones" },
    { label: "Turnos próximos", value: s?.upcomingShifts, sub: s ? plural(s.volunteers, "voluntario", "voluntarios") : "", Icon: isManager ? Users : CalendarClock, to: hasRole("donante") ? "/app/necesidades" : "/app/voluntariado" },
  ];

  return (
    <AppShell
      title={`Hola, ${firstName}`}
      subtitle="Resumen de la red de acopio"
      actions={!isManager && (
        <button type="button" className="btn-primary" onClick={() => setDonate("new")}>
          <PackageOpen size={16} /> Donar
        </button>
      )}
    >
      <div className="page">
        <div className="tiles">
          {tiles.map(({ label, value, sub, Icon, to, tone }) => (
            <Link key={label} to={to} className={`tile${tone ? ` tile-${tone}` : ""}`}>
              <span className="tile-icon"><Icon size={18} /></span>
              <span className="tile-label">{label}</span>
              <b className="tile-value">{value === undefined ? "–" : fmtNumber(value)}</b>
              {sub && <span className="tile-sub">{sub}</span>}
            </Link>
          ))}
        </div>

        <div className="dash-grid">
          <section className="card card-flush">
            <div className="card-head">
              <h2>Mapa de centros</h2>
              <Link to="/app/centros" className="link">Ver todos <ArrowRight size={14} /></Link>
            </div>
            <CentersMap
              centers={centers.data ?? []}
              className="leaflet-box dash-map"
              renderPopup={(c) => (
                <div className="map-popup">
                  <b>{c.name}</b>
                  <span>{c.address}</span>
                  <span>{plural(c.open_needs, "necesidad abierta", "necesidades abiertas")}</span>
                </div>
              )}
            />
          </section>

          <div className="stack">
            {isManager && (
              <section className="card">
                <div className="card-head">
                  <h2>Donaciones por recibir</h2>
                  <Link to="/app/donaciones" className="link">Gestionar <ArrowRight size={14} /></Link>
                </div>
                {(pending.data ?? []).length === 0 ? (
                  <Empty title="No hay donaciones pendientes" />
                ) : (
                  <ul className="mini-list">
                    {(pending.data ?? []).slice(0, 5).map((d) => (
                      <li key={d.id}>
                        <div>
                          <b>{fmtNumber(d.quantity)} {d.unit} de {d.item}</b>
                          <span>{d.donor_display} → {d.center_name}</span>
                        </div>
                        <DonationBadge status={d.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {isVolunteer && (
              <section className="card">
                <div className="card-head">
                  <h2>Mis próximos turnos</h2>
                  <Link to="/app/voluntariado" className="link">Ver turnos <ArrowRight size={14} /></Link>
                </div>
                {upcomingShifts.length === 0 ? (
                  <Empty title="Aún no te has inscrito en ningún turno">
                    <Link to="/app/voluntariado" className="btn btn-primary btn-sm">Buscar un turno</Link>
                  </Empty>
                ) : (
                  <ul className="mini-list">
                    {upcomingShifts.slice(0, 4).map((x) => (
                      <li key={x.id}>
                        <div>
                          <b>{x.title}</b>
                          <span>{fmtDay(x.date)} · {fmtTime(x.start_time)} – {fmtTime(x.end_time)}</span>
                          <span>{x.center_name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!isManager && (
              <section className="card">
                <div className="card-head">
                  <h2>Mis donaciones</h2>
                  <Link to="/app/donaciones" className="link">Ver historial <ArrowRight size={14} /></Link>
                </div>
                {(myDonations.data ?? []).length === 0 ? (
                  <Empty title="Todavía no has registrado donaciones" />
                ) : (
                  <ul className="mini-list">
                    {(myDonations.data ?? []).slice(0, 4).map((d) => (
                      <li key={d.id}>
                        <div>
                          <b>{fmtNumber(d.quantity)} {d.unit} de {d.item}</b>
                          <span>{d.center_name}</span>
                        </div>
                        <DonationBadge status={d.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="card">
              <div className="card-head">
                <h2>Necesidades urgentes</h2>
                <Link to="/app/necesidades" className="link">Ver todas <ArrowRight size={14} /></Link>
              </div>
              {urgentNeeds.length === 0 ? (
                <Empty title="No hay necesidades urgentes" />
              ) : (
                <ul className="mini-list">
                  {urgentNeeds.map((n) => (
                    <li key={n.id}>
                      <div>
                        <b>{n.item} · {fmtNumber(n.quantity)} {n.unit}</b>
                        <span>{categoryLabel(n.category)} · {n.center_name}</span>
                      </div>
                      {isManager ? (
                        <PriorityBadge priority={n.priority} />
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDonate(n)}>Donar</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {donate && centers.data && (
        <DonateModal
          centers={centers.data}
          preset={donate === "new" ? undefined : { center_id: donate.center_id, category: donate.category, item: donate.item, unit: donate.unit }}
          onClose={() => setDonate(null)}
          onDone={() => { setDonate(null); void myDonations.reload(); void stats.reload(); }}
        />
      )}
    </AppShell>
  );
}
