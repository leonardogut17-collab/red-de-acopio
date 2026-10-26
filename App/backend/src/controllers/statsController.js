const db = require("../config/database");

// GET /api/stats  (público) — cifras generales para la página de inicio y el panel
const getStats = (req, res) => {
    const one = (sql) => db.prepare(sql).get().n;
    res.json({
        centers: one("SELECT COUNT(*) AS n FROM centers WHERE is_active = 1"),
        openNeeds: one(
            "SELECT COUNT(*) AS n FROM needs n JOIN centers c ON c.id = n.center_id WHERE n.status = 'abierta' AND c.is_active = 1"
        ),
        urgentNeeds: one(
            "SELECT COUNT(*) AS n FROM needs n JOIN centers c ON c.id = n.center_id WHERE n.status = 'abierta' AND n.priority = 'alta' AND c.is_active = 1"
        ),
        donationsReceived: one("SELECT COUNT(*) AS n FROM donations WHERE status = 'recibida'"),
        donationsPending: one("SELECT COUNT(*) AS n FROM donations WHERE status = 'prometida'"),
        volunteers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'voluntario' AND is_active = 1"),
        upcomingShifts: one("SELECT COUNT(*) AS n FROM shifts WHERE date >= date('now', 'localtime')"),
        deliveries: one("SELECT COUNT(*) AS n FROM deliveries")
    });
};

module.exports = { getStats };
