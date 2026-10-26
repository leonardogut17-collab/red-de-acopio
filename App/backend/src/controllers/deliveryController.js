const db = require("../config/database");
const { computeInventory } = require("./centerController");
const {
    HttpError,
    requireFields,
    cleanText,
    positiveNumber,
    validCategory,
    getCenterOr404,
    assertCanManageCenter
} = require("../utils/http");

// GET /api/deliveries?centerId=  (admin o coordinador del centro)
const listDeliveries = (req, res) => {
    if (!req.query.centerId) throw new HttpError(400, "Indica el centro (centerId)");
    const center = getCenterOr404(req.query.centerId);
    assertCanManageCenter(req.user, center);

    const rows = db
        .prepare(`
            SELECT dl.*, u.name AS created_by_name
            FROM deliveries dl
            LEFT JOIN users u ON u.id = dl.created_by
            WHERE dl.center_id = ?
            ORDER BY dl.created_at DESC
        `)
        .all(center.id);
    res.json(rows);
};

// POST /api/deliveries  (admin o coordinador del centro) — registra una salida de inventario
const createDelivery = (req, res) => {
    requireFields(req.body, ["center_id", "category", "item", "quantity", "beneficiary"]);
    const center = getCenterOr404(req.body.center_id);
    assertCanManageCenter(req.user, center);

    const category = validCategory(req.body.category);
    const item = cleanText(req.body.item, 120);
    const unit = cleanText(req.body.unit, 30) || "unidades";
    const quantity = positiveNumber(req.body.quantity, "cantidad");

    // No se puede entregar más de lo que hay en existencia
    const stockRow = computeInventory(center.id).find(
        (r) => r.category === category && r.item === item.toLowerCase() && r.unit === unit
    );
    const stock = stockRow ? stockRow.stock : 0;
    if (quantity > stock) {
        throw new HttpError(400, `Existencias insuficientes: hay ${stock} ${unit} de "${item}"`);
    }

    const result = db
        .prepare(`
            INSERT INTO deliveries (center_id, category, item, quantity, unit, beneficiary, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(center.id, category, item, quantity, unit, cleanText(req.body.beneficiary, 160), cleanText(req.body.notes, 500), req.user.id);

    res.status(201).json(db.prepare("SELECT * FROM deliveries WHERE id = ?").get(result.lastInsertRowid));
};

module.exports = { listDeliveries, createDelivery };
