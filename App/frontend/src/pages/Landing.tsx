import { ArrowRight, CalendarClock, HandHeart, MapPin, PackageOpen, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { CentersMap } from "@/components/CentersMap";
import { PriorityBadge } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { categoryLabel, fmtNumber, plural } from "@/lib/labels";
import "@/styles/public.css";
import "@/styles/landing.css";

const HOW = [
  {
    Icon: PackageOpen,
    title: "Dona lo que hace falta",
    text: "Mira qué necesita cada centro, registra tu donación y llévala. El equipo del centro confirma cuando llega.",
    cta: "Quiero donar",
    to: "/register?rol=donante",
  },
  {
    Icon: CalendarClock,
    title: "Inscríbete como voluntario",
    text: "Elige un turno de clasificación, recepción o entrega en el centro y horario que te queden mejor.",
    cta: "Quiero ser voluntario",
    to: "/register?rol=voluntario",
  },
  {
    Icon: ShieldCheck,
    title: "Coordina un centro",
    text: "Los coordinadores publican necesidades, reciben donaciones, controlan el inventario y organizan turnos.",
    cta: "Ya tengo cuenta",
    to: "/login",
  },
];

export function Landing() {
  const stats = useLoad(() => api.stats());
  const centers = useLoad(() => api.centers.list());
  const needs = useLoad(() => api.needs.list());

  const urgent = (needs.data ?? []).filter((n) => n.priority === "alta").slice(0, 6);
  const s = stats.data;

  return (
    <main className="landing">
      <section className="hero">
        <div className="container">
          <img className="hero-logo" src="/assets/images/logo.png" alt="Logo de Red de Acopio" width={112} height={112} />
          <span className="hero-badge"><HandHeart size={14} /> Red de centros de acopio · Bogotá</span>
          <h1>Ayuda donde <em>de verdad</em> hace falta</h1>
          <p className="lead">
            Consulta qué necesita cada centro de acopio, registra tus donaciones e inscríbete en turnos de voluntariado.
            Todo coordinado en un mismo lugar.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">Quiero ayudar <ArrowRight size={17} /></Link>
            <a href="#mapa" className="btn btn-secondary btn-lg">Ver centros</a>
          </div>
          <div className="hero-stats" aria-live="polite">
            <div className="stat"><b>{s ? fmtNumber(s.centers) : "–"}</b><span>Centros activos</span></div>
            <div className="stat"><b className="urgent">{s ? fmtNumber(s.urgentNeeds) : "–"}</b><span>Necesidades urgentes</span></div>
            <div className="stat"><b>{s ? fmtNumber(s.donationsReceived) : "–"}</b><span>Donaciones recibidas</span></div>
            <div className="stat"><b>{s ? fmtNumber(s.volunteers) : "–"}</b><span>Voluntarios</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="mapa">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Centros de acopio</span>
            <h2>Encuentra el centro más cercano</h2>
            <p>Los pines en coral tienen necesidades urgentes. Haz clic en uno para ver su dirección y horario.</p>
          </div>
          <div className="landing-map-grid">
            <div className="landing-map">
              <CentersMap
                centers={centers.data ?? []}
                renderPopup={(c) => (
                  <div className="map-popup">
                    <b>{c.name}</b>
                    <span>{c.address}</span>
                    {c.schedule && <span>{c.schedule}</span>}
                    <span>{plural(c.open_needs, "necesidad abierta", "necesidades abiertas")}</span>
                  </div>
                )}
              />
            </div>
            <ul className="landing-center-list">
              {(centers.data ?? []).map((c) => (
                <li key={c.id}>
                  <MapPin size={18} className={c.urgent_needs ? "urgent" : ""} />
                  <div>
                    <b>{c.name}</b>
                    <span>{c.address}</span>
                    {c.schedule && <span className="muted">{c.schedule}</span>}
                  </div>
                  {c.urgent_needs > 0 && <span className="badge badge-alta">{plural(c.urgent_needs, "urgente", "urgentes")}</span>}
                </li>
              ))}
              {centers.data?.length === 0 && <li className="muted">Aún no hay centros registrados.</li>}
              {centers.error && <li className="muted">No se pudo conectar con el servidor.</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-soft" id="necesidades">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Lo más urgente</span>
            <h2>Esto es lo que más se necesita hoy</h2>
            <p>Los coordinadores actualizan esta lista a medida que llegan las donaciones.</p>
          </div>
          {urgent.length > 0 ? (
            <div className="need-grid">
              {urgent.map((n) => (
                <article key={n.id} className="need-card">
                  <div className="need-card-top">
                    <span className="chip">{categoryLabel(n.category)}</span>
                    <PriorityBadge priority={n.priority} />
                  </div>
                  <h3>{n.item}</h3>
                  <p className="need-qty">{fmtNumber(n.quantity)} {n.unit}</p>
                  <p className="muted"><MapPin size={13} /> {n.center_name}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="center muted">No hay necesidades urgentes en este momento.</p>
          )}
          <div className="center" style={{ marginTop: 32 }}>
            <Link to="/register?rol=donante" className="btn btn-primary">Registrar una donación <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="como-ayudar">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow eyebrow-dark">Cómo ayudar</span>
            <h2>Hay un lugar para cada persona</h2>
          </div>
          <div className="how-grid">
            {HOW.map(({ Icon, title, text, cta, to }) => (
              <article key={title} className="how-card">
                <span className="how-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link to={to} className="how-link">{cta} <ArrowRight size={15} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
