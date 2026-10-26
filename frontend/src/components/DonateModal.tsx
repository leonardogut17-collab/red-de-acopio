import { useState } from "react";
import { api } from "@/lib/api";
import { CATEGORIES, UNITS } from "@/lib/labels";
import type { Category, Center } from "@/types";
import { ErrorNote, Modal } from "./ui";

interface Props {
  centers: Center[];
  onClose: () => void;
  onDone: () => void;
  preset?: { center_id?: number; category?: Category; item?: string; unit?: string };
  /** Modo coordinador: registra una donación que ya llegó al centro (sin cuenta de donante) */
  walkIn?: boolean;
}

export function DonateModal({ centers, onClose, onDone, preset, walkIn }: Props) {
  const [form, setForm] = useState({
    center_id: preset?.center_id ?? centers[0]?.id ?? 0,
    category: preset?.category ?? ("alimentos" as Category),
    item: preset?.item ?? "",
    quantity: "",
    unit: preset?.unit ?? "unidades",
    notes: "",
    donor_name: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.donations.create({
        center_id: Number(form.center_id),
        category: form.category,
        item: form.item,
        quantity: Number(form.quantity),
        unit: form.unit,
        notes: form.notes || undefined,
        ...(walkIn ? { status: "recibida" as const, donor_name: form.donor_name || undefined } : {}),
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={walkIn ? "Registrar donación recibida" : "Registrar una donación"} onClose={onClose}>
      {!walkIn && (
        <p className="modal-hint">
          Cuéntanos qué vas a llevar. El centro la verá como <b>por entregar</b> y la marcará como recibida cuando llegues.
        </p>
      )}
      <ErrorNote message={error} />
      <form onSubmit={submit} className="form-grid">
        <div className="form-group span-2">
          <label className="form-label" htmlFor="d-center">Centro de acopio</label>
          <select id="d-center" className="form-select" value={form.center_id} onChange={set("center_id")} required>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {walkIn && (
          <div className="form-group span-2">
            <label className="form-label" htmlFor="d-donor">Nombre del donante (opcional)</label>
            <input id="d-donor" className="form-input" value={form.donor_name} onChange={set("donor_name")} placeholder="Ej. Tienda El Vecino" />
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="d-cat">Categoría</label>
          <select id="d-cat" className="form-select" value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="d-item">¿Qué donas?</label>
          <input id="d-item" className="form-input" value={form.item} onChange={set("item")} required placeholder="Ej. Arroz" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="d-qty">Cantidad</label>
          <input id="d-qty" type="number" min="0.01" step="any" className="form-input" value={form.quantity} onChange={set("quantity")} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="d-unit">Unidad</label>
          <select id="d-unit" className="form-select" value={form.unit} onChange={set("unit")}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="form-group span-2">
          <label className="form-label" htmlFor="d-notes">Notas (opcional)</label>
          <textarea id="d-notes" className="form-input" rows={2} value={form.notes} onChange={set("notes")} placeholder="Fecha de vencimiento, estado, cuándo la llevas…" />
        </div>
        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : walkIn ? "Registrar entrada" : "Registrar donación"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
