const db = require("../config/database");
const { ROLES } = require("../config/database");
const { HttpError } = require("../utils/http");

// GET /api/users?role=  (admin)
const listUsers = (req, res) => {
    const params = [];
    let where = "";
    if (req.query.role) {
        where = "WHERE role = ?";
        params.push(req.query.role);
    }
    const rows = db
        .prepare(`SELECT id, name, email, role, phone, is_active, created_at FROM users ${where} ORDER BY created_at DESC`)
        .all(...params);
    res.json(rows);
};

// PATCH /api/users/:id  (admin) — cambia rol o activa/desactiva la cuenta
const updateUser = (req, res) => {
    const user = db.prepare("SELECT id, role, is_active FROM users WHERE id = ?").get(req.params.id);
    if (!user) throw new HttpError(404, "Usuario no encontrado");

    if (user.id === req.user.id) {
        throw new HttpError(400, "No puedes cambiar tu propio rol ni desactivar tu cuenta");
    }

    let { role, is_active: isActive } = user;
    if (req.body.role !== undefined) {
        if (!ROLES.includes(req.body.role)) throw new HttpError(400, "Rol inválido");
        role = req.body.role;
    }
    if (req.body.is_active !== undefined) isActive = req.body.is_active ? 1 : 0;

    db.prepare("UPDATE users SET role = ?, is_active = ? WHERE id = ?").run(role, isActive, user.id);

    // Si deja de ser coordinador, se libera de los centros que tenía asignados
    if (!["coordinador", "admin"].includes(role)) {
        db.prepare("UPDATE centers SET coordinator_id = NULL WHERE coordinator_id = ?").run(user.id);
    }

    res.json(
        db.prepare("SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?").get(user.id)
    );
};

module.exports = { listUsers, updateUser };
