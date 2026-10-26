import { useEffect, useState } from "react";
import { Boxes, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty, ErrorNote, Loading, Modal } from "@/components/ui";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { categoryLabel, fmtDateTime, fmtNumber } from "@/lib/labels";
import type { InventoryRow } from "@/types";

export function Inventory() {
  const centers = useLoad(() => api.centers.mine());
  const [centerId, setCenterId] = useState<number | null>(null);

  useEffect(() => {
    if (!centerId && centers.data?.length) setCenterId(centers.data[0].id);
  }, [centers.data, centerId]);

  const inventory = useLoad(() => (centerId ? api.centers.inventory(centerId) : Promise.resolve([])), [centerId]);
  const deliveries = useLoad(() => (centerId ? api.deliveries.list(centerId) : Promise.resolve([])), [centerId]);
  const [delivering, setDelivering] = useState<InventoryRow | "pick" | null>(null);

  const inStock = (inventory.data ?? []).filter((r) => r.stock > 0);

  if (centers.data && centers.data.length === 0) {
    return (
      <AppShell title="Inventario" subtitle="Existencias por centro">
        <div className="page">
          <Empty icon={<Boxes size={28} />} title="No tienes centros asignados">
            <p>Pide a un administrador que te asigne como coordinador de un centro.</p>
          </Empty>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Inventario"
      subtitle="Existencias = donaciones recibidas − entregas"
      actions={inStock.length > 0 && (
        <button type="button" className="btn-primary" onClick={() => setDelivering("pick")}><Send size={16} /> Registrar entrega</button>
      )}
    >
      <div className="page">
        <div className="filters">
          <select className="form-select" value={centerId ?? ""} onChange={(e) => setCenterId(Number(e.target.value))} aria-label="Centro">
            {(centers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <ErrorNote message={inventory.error || deliveries.error} />

        <section className="card">
          <div className="card-head"><h2>Existencias</h2></div>
          {inventory.loading && !inventory.data ? <Loading /> : (inventory.data ?? []).length === 0 ? (
            <Empty title="Este centro aún no ha recibido donaciones" />
          ) : (
            <div className="table-wrap flat">
              <table className="table">
                <thead>
                  <tr>
                    <th>Insumo</th><th>Categoría</th>
                    <th className="num">Recibido</th><th className="num">Entregado</th><th className="num">Disponible</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {(inventory.data ?? []).map((r) => (
                    <tr key={`${r.category}-${r.item}-${r.unit}`} className={r.stock <= 0 ? "row-muted" : ""}>
                      <td><b className="capitalize">{r.item}</b></td>
                      <td>{categoryLabel(r.category)}</td>
                      <td className="num">{fmtNumber(r.received)} {r.unit}</td>
                      <td className="num">{fmtNumber(r.delivered)} {r.unit}</td>
                      <td className="num"><b className={r.stock > 0 ? "ok" : ""}>{fmtNumber(r.stock)} {r.unit}</b></td>
                      <td className="row-actions">
                        {r.stock > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDelivering(r)}>Entregar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Historial de entregas</h2></div>
          {(deliveries.data ?? []).length === 0 ? (
            <Empty title="Todavía no se han registrado entregas" />
          ) : (
            <div className="table-wrap flat">
              <table className="table">
                <thead>
                  <tr><th>Fecha</th><th>Insumo</th><th className="num">Cantidad</th><th>Beneficiario</th><th>Registró</th></tr>
                </thead>
                <tbody>
                  {(deliveries.data ?? []).map((d) => (
                    <tr key={d.id}>
                      <td className="muted nowrap">{fmtDateTime(d.created_at)}</td>
                      <td><b>{d.item}</b><small className="block muted">{categoryLabel(d.category)}</small></td>
                      <td className="num">{fmtNumber(d.quantity)} {d.unit}</td>
                      <td>{d.beneficiary}{d.notes && <small className="block muted">{d.notes}</small>}</td>
                      <td>{d.created_by_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {delivering && centerId && (
        <DeliveryForm
          centerId={centerId}
          stock={inStock}
          initial={delivering === "pick" ? inStock[0] : delivering}
          onClose={() => setDelivering(null)}
          onSaved={() => { setDelivering(null); void inventory.reload(); void deliveries.reload(); }}
        />
      )}
    </AppShell>
  );
}

const rowKey = (r: InventoryRow) => `${r.category}|${r.item}|${r.unit}`;

function DeliveryForm({
  centerId, stock, initial, onClose, onSaved,
}: { centerId: number; stock: InventoryRow[]; initial: InventoryRow; onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState(rowKey(initial));
  const [quantity, setQuantity] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const row = stock.find((r) => rowKey(r) === key) ?? initial;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.deliveries.create({
        center_id: centerId, category: row.category, item: row.item, unit: row.unit,
        quantity: Number(quantity), beneficiary, notes: notes || undefined,
      });
      onSaved();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <Modal title="Registrar entrega" onClose={onClose}>
      <p className="modal-hint">Registra lo que sale del centro hacia familias o comunidades. Se descuenta del inventario.</p>
      <ErrorNote message={error} />
      <form onSubmit={submit} className="form-grid">
        <div className="form-group span-2">
          <label className="form-label" htmlFor="dl-item">Insumo</label>
          <select id="dl-item" className="form-select" value={key} onChange={(e) => setKey(e.target.value)}>
            {stock.map((r) => <option key={rowKey(r)} value={rowKey(r)}>{r.item} — {fmtNumber(r.stock)} {r.unit} disponibles</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="dl-qty">Cantidad ({row.unit})</label>
          <input id="dl-qty" type="number" min="0.01" max={row.stock} step="any" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="dl-ben">Beneficiario</label>
          <input id="dl-ben" className="form-input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} required placeholder="Familia, comunidad o institución" />
        </div>
        <div className="form-group span-2">
          <label className="form-label" htmlFor="dl-notes">Notas (opcional)</label>
          <input id="dl-notes" className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Registrar entrega</button>
        </div>
      </form>
    </Modal>
  );
}
