const db = require("../config/database");
const {
    HttpError,
    requireFields,
    cleanText,
    positiveNumber,
    getCenterOr404,
    assertCanManageCenter,
    canManageCenter
} = require("../utils/http");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const SHIFT_SELECT = `
    SELECT s.*,
           c.name AS center_name,
           c.address AS center_address,
           c.coordinator_id,
           (SELECT COUNT(*) FROM shift_signups ss WHERE ss.shift_id = s.id) AS signed_up,
           EXISTS (SELECT 1 FROM shift_signups ss WHERE ss.shift_id = s.id AND ss.user_id = ?) AS is_signed_up
    FROM shifts s
    JOIN centers c ON c.id = s.center_id
`;

const getShiftOr404 = (id, userId) => {
    const shift = db.prepare(`${SHIFT_SELECT} WHERE s.id = ?`).get(userId, id);
    if (!shift) throw new HttpError(404, "Turno no encontrado");
    return shift;
};

const decorate = (user) => (s) => ({
    ...s,
    is_signed_up: Boolean(s.is_signed_up),
    can_manage: canManageCenter(user, { coordinator_id: s.coordinator_id })
});

// GET /api/shifts?centerId=&past=1  (usuarios autenticados)
const listShifts = (req, res) => {
    const where = ["c.is_active = 1"];
    const params = [req.user.id];
    if (req.query.past !== "1") {
        where.push("s.date >= date('now', 'localtime')");
    }
    if (req.query.centerId) {
        where.push("s.center_id = ?");
        params.push(req.query.centerId);
    }
    const rows = db
        .prepare(`${SHIFT_SELECT} WHERE ${where.join(" AND ")} ORDER BY s.date, s.start_time`)
        .all(...params);
    res.json(rows.map(decorate(req.user)));
};

// GET /api/shifts/mine  (turnos en los que el voluntario está inscrito)
const myShifts = (req, res) => {
    const rows = db
        .prepare(`
            ${SHIFT_SELECT}
            WHERE s.id IN (SELECT shift_id FROM shift_signups WHERE user_id = ?)
            ORDER BY s.date, s.start_time
        `)
        .all(req.user.id, req.user.id);
    res.json(rows.map(decorate(req.user)));
};

// POST /api/shifts  (admin o coordinador del centro)
const createShift = (req, res) => {
    requireFields(req.body, ["center_id", "title", "date", "start_time", "end_time", "slots"]);
    const center = getCenterOr404(req.body.center_id);
    assertCanManageCenter(req.user, center);

    const { date, start_time: start, end_time: end } = req.body;
    if (!DATE_RE.test(date)) throw new HttpError(400, "Fecha inválida (AAAA-MM-DD)");
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) throw new HttpError(400, "Hora inválida (HH:MM)");
    if (end <= start) throw new HttpError(400, "La hora de fin debe ser posterior a la de inicio");

    const slots = Math.floor(positiveNumber(req.body.slots, "cupos"));

    const result = db
        .prepare(`
            INSERT INTO shifts (center_id, title, description, date, start_time, end_time, slots)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(center.id, cleanText(req.body.title, 120), cleanText(req.body.description, 500), date, start, end, slots);

    res.status(201).json(decorate(req.user)(getShiftOr404(result.lastInsertRowid, req.user.id)));
};

// DELETE /api/shifts/:id  (admin o coordinador del centro)
const deleteShift = (req, res) => {
    const shift = getShiftOr404(req.params.id, req.user.id);
    assertCanManageCenter(req.user, { coordinator_id: shift.coordinator_id });
    db.prepare("DELETE FROM shifts WHERE id = ?").run(shift.id);
    res.json({ message: "Turno eliminado" });
};

// POST /api/shifts/:id/signup  (voluntarios)
// Se hace dentro de una transacción para que dos inscripciones simultáneas no superen los cupos
const signUp = db.transaction((shiftId, userId) => {
    const shift = getShiftOr404(shiftId, userId);
    if (shift.is_signed_up) throw new HttpError(400, "Ya estás inscrito en este turno");
    if (shift.signed_up >= shift.slots) throw new HttpError(400, "El turno ya no tiene cupos");
    db.prepare("INSERT INTO shift_signups (shift_id, user_id) VALUES (?, ?)").run(shift.id, userId);
    return getShiftOr404(shift.id, userId);
});

const signUpShift = (req, res) => {
    res.status(201).json(decorate(req.user)(signUp(req.params.id, req.user.id)));
};

// DELETE /api/shifts/:id/signup  (voluntarios)
const cancelSignUp = (req, res) => {
    const shift = getShiftOr404(req.params.id, req.user.id);
    const result = db
        .prepare("DELETE FROM shift_signups WHERE shift_id = ? AND user_id = ?")
        .run(shift.id, req.user.id);
    if (!result.changes) throw new HttpError(400, "No estabas inscrito en este turno");
    res.json(decorate(req.user)(getShiftOr404(shift.id, req.user.id)));
};

// GET /api/shifts/:id/volunteers  (admin o coordinador del centro)
const listVolunteers = (req, res) => {
    const shift = getShiftOr404(req.params.id, req.user.id);
    assertCanManageCenter(req.user, { coordinator_id: shift.coordinator_id });
    const rows = db
        .prepare(`
            SELECT u.id, u.name, u.email, u.phone, ss.created_at AS signed_up_at
            FROM shift_signups ss JOIN users u ON u.id = ss.user_id
            WHERE ss.shift_id = ?
            ORDER BY ss.created_at
        `)
        .all(shift.id);
    res.json(rows);
};

module.exports = { listShifts, myShifts, createShift, deleteShift, signUpShift, cancelSignUp, listVolunteers };
