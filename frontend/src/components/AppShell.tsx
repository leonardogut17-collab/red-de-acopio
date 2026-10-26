import type { ReactNode } from "react";
import {
  Boxes, CalendarClock, Home, LogOut, MapPinned, PackageOpen, ListChecks, Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/types";
import "@/styles/dashboard.css";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Las vistas con mapa a pantalla completa no llevan padding ni scroll */
  bleed?: boolean;
}

const ALL: Role[] = ["admin", "coordinador", "voluntario", "donante"];
const MANAGERS: Role[] = ["admin", "coordinador"];

const NAV_ITEMS: { path: string; label: string; Icon: typeof Home; roles: Role[]; end?: boolean }[] = [
  { path: "/app", label: "Inicio", Icon: Home, roles: ALL, end: true },
  { path: "/app/centros", label: "Centros", Icon: MapPinned, roles: ALL },
  { path: "/app/necesidades", label: "Necesidades", Icon: ListChecks, roles: ALL },
  { path: "/app/donaciones", label: "Donaciones", Icon: PackageOpen, roles: ALL },
  { path: "/app/inventario", label: "Inventario", Icon: Boxes, roles: MANAGERS },
  { path: "/app/voluntariado", label: "Turnos", Icon: CalendarClock, roles: ["admin", "coordinador", "voluntario"] },
  { path: "/app/usuarios", label: "Usuarios", Icon: Users, roles: ["admin"] },
];

export function AppShell({ title, subtitle, actions, children, bleed }: AppShellProps) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((i) => user && i.roles.includes(user.role));

  return (
    <div className="app">
      <aside className="nav" aria-label="Principal">
        <NavLink to="/app" className="nav-brand" aria-label="Red de Acopio, inicio">
          <img src="/assets/images/logo.png" alt="" width={48} height={48} />
        </NavLink>
        {items.map(({ path, label, Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="nav-spacer" />
        <button
          type="button"
          className="nav-item"
          onClick={() => { if (window.confirm("¿Cerrar sesión?")) logout(); }}
        >
          <LogOut size={20} />
          <span>Salir</span>
        </button>
      </aside>

      <header className="header">
        <div className="header-context">
          <div className="name">{title}</div>
          {subtitle && <div className="meta">{subtitle}</div>}
        </div>
        <div className="header-spacer" />
        {actions && <div className="header-actions">{actions}</div>}
        {user && (
          <div className="header-user" title={user.email}>
            <span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
            <span className="who">
              <b>{user.name}</b>
              <small>{ROLE_LABELS[user.role]}</small>
            </span>
          </div>
        )}
      </header>

      <main className={`app-content${bleed ? " bleed" : ""}`}>{children}</main>
    </div>
  );
}
