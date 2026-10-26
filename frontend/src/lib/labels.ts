import type { Category, DonationStatus, Priority, Role } from "@/types";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "alimentos", label: "Alimentos" },
  { value: "agua", label: "Agua" },
  { value: "higiene", label: "Higiene personal" },
  { value: "aseo", label: "Aseo" },
  { value: "ropa", label: "Ropa" },
  { value: "cobijas", label: "Cobijas" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "otros", label: "Otros" },
];

export const UNITS = ["unidades", "kg", "litros", "paquetes", "cajas", "prendas", "bolsas"];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  voluntario: "Voluntario",
  donante: "Donante",
};

export const PRIORITY_LABELS: Record<Priority, string> = { alta: "Urgente", media: "Media", baja: "Baja" };

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  prometida: "Por entregar",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

export const fmtNumber = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n);

/** Las fechas de SQLite llegan como "AAAA-MM-DD HH:MM:SS" en UTC */
export const fmtDateTime = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
};

export const fmtDay = (s: string) =>
  new Date(`${s}T12:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
};

/** "1 voluntario", "3 voluntarios" */
export const plural = (n: number, one: string, many: string) => `${fmtNumber(n)} ${n === 1 ? one : many}`;
