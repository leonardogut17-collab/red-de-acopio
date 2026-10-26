const db = require("../config/database");
const { CATEGORIES } = require("../config/database");

/** Error con código HTTP que el manejador global convierte en respuesta JSON */
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/** Convierte un valor a número positivo o lanza error 400 */
const positiveNumber = (value, field) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new HttpError(400, `El campo ${field} debe ser un número mayor a 0`);
    }
    return n;
};

/** Valida que existan los campos obligatorios (strings no vacíos o números) */
const requireFields = (body, fields) => {
    const missing = fields.filter((f) => {
        const v = body[f];
        return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    });
    if (missing.length) {
        throw new HttpError(400, `Campos obligatorios: ${missing.join(", ")}`);
    }
};

const cleanText = (value, max = 255) => {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s ? s.slice(0, max) : null;
};

const validCategory = (category) => {
    if (!CATEGORIES.includes(category)) {
        throw new HttpError(400, `Categoría inválida. Opciones: ${CATEGORIES.join(", ")}`);
    }
    return category;
};

const getCenterOr404 = (centerId) => {
    const center = db.prepare("SELECT * FROM centers WHERE id = ?").get(centerId);
    if (!center) throw new HttpError(404, "Centro de acopio no encontrado");
    return center;
};

/**
 * Un admin puede gestionar cualquier centro; un coordinador solo los que tiene asignados.
 */
const canManageCenter = (user, center) =>
    user.role === "admin" || (user.role === "coordinador" && center.coordinator_id === user.id);

const assertCanManageCenter = (user, center) => {
    if (!canManageCenter(user, center)) {
        throw new HttpError(403, "Solo el coordinador asignado o un administrador pueden gestionar este centro");
    }
};

module.exports = {
    HttpError,
    positiveNumber,
    requireFields,
    cleanText,
    validCategory,
    getCenterOr404,
    canManageCenter,
    assertCanManageCenter
};
