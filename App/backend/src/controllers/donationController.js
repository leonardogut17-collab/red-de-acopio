const db = require("../config/database");
const {
    HttpError,
    requireFields,
    cleanText,
    positiveNumber,
    validCategory,
    getCenterOr404,
    canManageCenter,
    assertCanManageCenter
} = require("../utils/http");

const DONATION_SELECT = `
    SELECT d.*,
           c.name AS center_name,
           COALESCE(u.name, d.donor_name, 'Anónimo') AS donor_display,
           u.email AS donor_email,
           r.name AS received_by_name
    FROM donations d
    JOIN centers c ON c.id = d.center_id
    LEFT JOIN users u ON u.id = d.donor_id
    LEFT JOIN users r ON r.id = d.received_by
`;

const getDonationOr404 = (id) => {
    const donation = db.prepare("SELECT * FROM donations WHERE id = ?").get(id);
    if (!donation) throw new HttpError(404, "Donación no encontrada");
    return donation;
};

// GET /api/donations/mine  (cualquier usuario autenticado)
const myDonations = (req, res) => {
    const rows = db
        .prepare(`${DONATION_SELECT} WHERE d.donor_id = ? ORDER BY d.created_at DESC`)
        .all(req.user.id);
    res.json(rows);
};

// GET /api/donations?centerId=&status=  (admin: todas; coordinador: las de sus centros)
const listDonations = (req, res) => {
    const where = [];
    const params = [];

    if (req.user.role === "coordinador") {
        where.push("c.coordinator_id = ?");
        params.push(req.user.id);
    }
    if (req.query.centerId) {
        where.push("d.center_id = ?");
        params.push(req.query.centerId);
    }
    if (req.query.status) {
        where.push("d.status = ?");
        params.push(req.query.status);
    }

    const rows = db
        .prepare(`
            ${DONATION_SELECT}
            ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
            ORDER BY CASE d.status WHEN 'prometida' THEN 1 WHEN 'recibida' THEN 2 ELSE 3 END, d.created_at DESC
        `)
        .all(...params);
    res.json(rows);
};

/**
 * POST /api/donations
 * - Cualquier usuario registra una donación "prometida" (la lleva luego al centro).
 * - El coordinador/admin del centro puede registrar directamente una donación "recibida"
 *   (por ejemplo, alguien que llegó sin cuenta), indicando donor_name.
 */
const createDonation = (req, res) => {
    requireFields(req.body, ["center_id", "category", "item", "quantity"]);
    const center = getCenterOr404(req.body.center_id);
    if (!center.is_active) throw new HttpError(400, "Este centro no está recibiendo donaciones");

    const manager = canManageCenter(req.user, center);
    const directReceive = req.body.status === "recibida";
    if (directReceive && !manager) {
        throw new HttpError(403, "Solo el coordinador del centro puede registrar donaciones recibidas");
    }

    const donorName = directReceive ? cleanText(req.body.donor_name, 120) : null;

    const result = db
        .prepare(`
            INSERT INTO donations (center_id, donor_id, donor_name, category, item, quantity, unit, status, notes, received_by, received_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
            center.id,
            directReceive ? null : req.user.id,
            donorName,
            validCategory(req.body.category),
            cleanText(req.body.item, 120),
            positiveNumber(req.body.quantity, "cantidad"),
            cleanText(req.body.unit, 30) || "unidades",
            directReceive ? "recibida" : "prometida",
            cleanText(req.body.notes, 500),
            directReceive ? req.user.id : null,
            directReceive ? new Date().toISOString() : null
        );

    res.status(201).json(db.prepare(`${DONATION_SELECT} WHERE d.id = ?`).get(result.lastInsertRowid));
};

// PATCH /api/donations/:id/receive  (admin o coordinador del centro)
const receiveDonation = (req, res) => {
    const donation = getDonationOr404(req.params.id);
    assertCanManageCenter(req.user, getCenterOr404(donation.center_id));
    if (donation.status !== "prometida") {
        throw new HttpError(400, `La donación ya está ${donation.status}`);
    }

    // Permite ajustar la cantidad real recibida
    const quantity = req.body.quantity !== undefined ? positiveNumber(req.body.quantity, "cantidad") : donation.quantity;

    db.prepare(`
        UPDATE donations SET status = 'recibida', quantity = ?, received_by = ?, received_at = ?
        WHERE id = ?
    `).run(quantity, req.user.id, new Date().toISOString(), donation.id);

    res.json(db.prepare(`${DONATION_SELECT} WHERE d.id = ?`).get(donation.id));
};

// PATCH /api/donations/:id/cancel  (el donante dueño o el coordinador/admin del centro)
const cancelDonation = (req, res) => {
    const donation = getDonationOr404(req.params.id);
    const isOwner = donation.donor_id === req.user.id;
    const manager = canManageCenter(req.user, getCenterOr404(donation.center_id));
    if (!isOwner && !manager) throw new HttpError(403, "No puedes cancelar esta donación");
    if (donation.status !== "prometida") {
        throw new HttpError(400, "Solo se pueden cancelar donaciones prometidas");
    }

    db.prepare("UPDATE donations SET status = 'cancelada' WHERE id = ?").run(donation.id);
    res.json(db.prepare(`${DONATION_SELECT} WHERE d.id = ?`).get(donation.id));
};

module.exports = { myDonations, listDonations, createDonation, receiveDonation, cancelDonation };
