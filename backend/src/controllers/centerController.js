const db = require("../config/database");
const {
    HttpError,
    requireFields,
    cleanText,
    getCenterOr404,
    assertCanManageCenter,
    canManageCenter
} = require("../utils/http");

const CENTER_SELECT = `
    SELECT c.*,
           u.name AS coordinator_name,
           u.email AS coordinator_email,
           (SELECT COUNT(*) FROM needs n WHERE n.center_id = c.id AND n.status = 'abierta') AS open_needs,
           (SELECT COUNT(*) FROM needs n WHERE n.center_id = c.id AND n.status = 'abierta' AND n.priority = 'alta') AS urgent_needs
    FROM centers c
    LEFT JOIN users u ON u.id = c.coordinator_id
`;

const parseCoordinates = (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        throw new HttpError(400, "Coordenadas inválidas");
    }
    return { lat, lng };
};

const validateCoordinator = (coordinatorId) => {
    if (coordinatorId === undefined || coordinatorId === null || coordinatorId === "") return null;
    const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(coordinatorId);
    if (!user || !["coordinador", "admin"].includes(user.role)) {
        throw new HttpError(400, "El coordinador debe ser un usuario con rol coordinador o admin");
    }
    return user.id;
};

// GET /api/centers  (público; un admin ve también los inactivos)
const listCenters = (req, res) => {
    const includeInactive = req.user?.role === "admin" && req.query.all === "1";
    const rows = db
        .prepare(`${CENTER_SELECT} ${includeInactive ? "" : "WHERE c.is_active = 1"} ORDER BY c.name`)
        .all();
    res.json(rows.map((c) => ({ ...c, can_manage: req.user ? canManageCenter(req.user, c) : false })));
};

// GET /api/centers/mine  (centros que el usuario puede gestionar)
const myCenters = (req, res) => {
    const rows =
        req.user.role === "admin"
            ? db.prepare(`${CENTER_SELECT} ORDER BY c.name`).all()
            : db.prepare(`${CENTER_SELECT} WHERE c.coordinator_id = ? ORDER BY c.name`).all(req.user.id);
    res.json(rows);
};

// GET /api/centers/:id  (público)
const getCenter = (req, res) => {
    const center = db.prepare(`${CENTER_SELECT} WHERE c.id = ?`).get(req.params.id);
    if (!center || (!center.is_active && req.user?.role !== "admin")) {
        throw new HttpError(404, "Centro de acopio no encontrado");
    }
    const needs = db
        .prepare(`
            SELECT * FROM needs WHERE center_id = ? AND status = 'abierta'
            ORDER BY CASE priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, created_at DESC
        `)
        .all(center.id);
    res.json({ ...center, needs, can_manage: req.user ? canManageCenter(req.user, center) : false });
};

// POST /api/centers  (admin)
const createCenter = (req, res) => {
    requireFields(req.body, ["name", "address", "latitude", "longitude"]);
    const { lat, lng } = parseCoordinates(req.body.latitude, req.body.longitude);
    const coordinatorId = validateCoordinator(req.body.coordinator_id);

    const result = db
        .prepare(`
            INSERT INTO centers (name, address, city, latitude, longitude, phone, schedule, description, coordinator_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
            cleanText(req.body.name, 120),
            cleanText(req.body.address, 200),
            cleanText(req.body.city, 80) || "Bogotá",
            lat,
            lng,
            cleanText(req.body.phone, 40),
            cleanText(req.body.schedule, 120),
            cleanText(req.body.description, 1000),
            coordinatorId
        );

    res.status(201).json(db.prepare(`${CENTER_SELECT} WHERE c.id = ?`).get(result.lastInsertRowid));
};

// PUT /api/centers/:id  (admin o coordinador asignado)
const updateCenter = (req, res) => {
    const center = getCenterOr404(req.params.id);
    assertCanManageCenter(req.user, center);

    const data = { ...center };
    for (const field of ["name", "address", "city", "phone", "schedule", "description"]) {
        if (req.body[field] !== undefined) data[field] = cleanText(req.body[field], field === "description" ? 1000 : 200);
    }
    if (!data.name || !data.address) throw new HttpError(400, "Nombre y dirección son obligatorios");

    if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
        const { lat, lng } = parseCoordinates(req.body.latitude ?? center.latitude, req.body.longitude ?? center.longitude);
        data.latitude = lat;
        data.longitude = lng;
    }

    // Solo el admin puede reasignar coordinador o activar/desactivar el centro
    if (req.user.role === "admin") {
        if (req.body.coordinator_id !== undefined) data.coordinator_id = validateCoordinator(req.body.coordinator_id);
        if (req.body.is_active !== undefined) data.is_active = req.body.is_active ? 1 : 0;
    }

    db.prepare(`
        UPDATE centers SET name = ?, address = ?, city = ?, latitude = ?, longitude = ?, phone = ?,
               schedule = ?, description = ?, coordinator_id = ?, is_active = ?
        WHERE id = ?
    `).run(
        data.name, data.address, data.city || "Bogotá", data.latitude, data.longitude, data.phone,
        data.schedule, data.description, data.coordinator_id, data.is_active, center.id
    );

    res.json(db.prepare(`${CENTER_SELECT} WHERE c.id = ?`).get(center.id));
};

// DELETE /api/centers/:id  (admin)
const deleteCenter = (req, res) => {
    const center = getCenterOr404(req.params.id);
    db.prepare("DELETE FROM centers WHERE id = ?").run(center.id);
    res.json({ message: "Centro eliminado" });
};

/** Existencias = donaciones recibidas − entregas, agrupado por categoría, insumo y unidad */
const computeInventory = (centerId) =>
    db
        .prepare(`
            SELECT category, item, unit,
                   SUM(received) AS received,
                   SUM(delivered) AS delivered,
                   SUM(received) - SUM(delivered) AS stock
            FROM (
                SELECT category, LOWER(TRIM(item)) AS item, unit, quantity AS received, 0 AS delivered
                FROM donations WHERE center_id = ? AND status = 'recibida'
                UNION ALL
                SELECT category, LOWER(TRIM(item)) AS item, unit, 0 AS received, quantity AS delivered
                FROM deliveries WHERE center_id = ?
            )
            GROUP BY category, item, unit
            ORDER BY category, item
        `)
        .all(centerId, centerId);

// GET /api/centers/:id/inventory  (admin o coordinador asignado)
const getInventory = (req, res) => {
    const center = getCenterOr404(req.params.id);
    assertCanManageCenter(req.user, center);
    res.json(computeInventory(center.id));
};

module.exports = {
    listCenters,
    myCenters,
    getCenter,
    createCenter,
    updateCenter,
    deleteCenter,
    getInventory,
    computeInventory
};
