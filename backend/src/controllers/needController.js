const db = require("../config/database");
const {
    HttpError,
    requireFields,
    cleanText,
    positiveNumber,
    validCategory,
    getCenterOr404,
    assertCanManageCenter
} = require("../utils/http");

const PRIORITIES = ["alta", "media", "baja"];
const STATUSES = ["abierta", "cubierta"];

const NEED_SELECT = `
    SELECT n.*, c.name AS center_name, c.address AS center_address
    FROM needs n
    JOIN centers c ON c.id = n.center_id
`;

// GET /api/needs?centerId=&status=&category=  (público)
const listNeeds = (req, res) => {
    const where = ["c.is_active = 1"];
    const params = [];

    const status = req.query.status || "abierta";
    if (status !== "todas") {
        if (!STATUSES.includes(status)) throw new HttpError(400, "Estado inválido");
        where.push("n.status = ?");
        params.push(status);
    }
    if (req.query.centerId) {
        where.push("n.center_id = ?");
        params.push(req.query.centerId);
    }
    if (req.query.category) {
        where.push("n.category = ?");
        params.push(req.query.category);
    }

    const rows = db
        .prepare(`
            ${NEED_SELECT}
            WHERE ${where.join(" AND ")}
            ORDER BY CASE n.priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, n.created_at DESC
        `)
        .all(...params);
    res.json(rows);
};

// POST /api/needs  (admin o coordinador del centro)
const createNeed = (req, res) => {
    requireFields(req.body, ["center_id", "category", "item", "quantity"]);
    const center = getCenterOr404(req.body.center_id);
    assertCanManageCenter(req.user, center);

    const priority = req.body.priority || "media";
    if (!PRIORITIES.includes(priority)) throw new HttpError(400, "Prioridad inválida");

    const result = db
        .prepare(`
            INSERT INTO needs (center_id, category, item, quantity, unit, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
            center.id,
            validCategory(req.body.category),
            cleanText(req.body.item, 120),
            positiveNumber(req.body.quantity, "cantidad"),
            cleanText(req.body.unit, 30) || "unidades",
            priority
        );

    res.status(201).json(db.prepare(`${NEED_SELECT} WHERE n.id = ?`).get(result.lastInsertRowid));
};

const getNeedOr404 = (id) => {
    const need = db.prepare("SELECT * FROM needs WHERE id = ?").get(id);
    if (!need) throw new HttpError(404, "Necesidad no encontrada");
    return need;
};

// PUT /api/needs/:id  (admin o coordinador del centro)
const updateNeed = (req, res) => {
    const need = getNeedOr404(req.params.id);
    assertCanManageCenter(req.user, getCenterOr404(need.center_id));

    const data = { ...need };
    if (req.body.category !== undefined) data.category = validCategory(req.body.category);
    if (req.body.item !== undefined) data.item = cleanText(req.body.item, 120);
    if (req.body.quantity !== undefined) data.quantity = positiveNumber(req.body.quantity, "cantidad");
    if (req.body.unit !== undefined) data.unit = cleanText(req.body.unit, 30) || "unidades";
    if (req.body.priority !== undefined) {
        if (!PRIORITIES.includes(req.body.priority)) throw new HttpError(400, "Prioridad inválida");
        data.priority = req.body.priority;
    }
    if (req.body.status !== undefined) {
        if (!STATUSES.includes(req.body.status)) throw new HttpError(400, "Estado inválido");
        data.status = req.body.status;
    }
    if (!data.item) throw new HttpError(400, "El insumo es obligatorio");

    db.prepare(`
        UPDATE needs SET category = ?, item = ?, quantity = ?, unit = ?, priority = ?, status = ?
        WHERE id = ?
    `).run(data.category, data.item, data.quantity, data.unit, data.priority, data.status, need.id);

    res.json(db.prepare(`${NEED_SELECT} WHERE n.id = ?`).get(need.id));
};

// DELETE /api/needs/:id  (admin o coordinador del centro)
const deleteNeed = (req, res) => {
    const need = getNeedOr404(req.params.id);
    assertCanManageCenter(req.user, getCenterOr404(need.center_id));
    db.prepare("DELETE FROM needs WHERE id = ?").run(need.id);
    res.json({ message: "Necesidad eliminada" });
};

module.exports = { listNeeds, createNeed, updateNeed, deleteNeed };
