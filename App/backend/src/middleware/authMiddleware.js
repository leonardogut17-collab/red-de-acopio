const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifica el token "Bearer" y carga el usuario desde la base de datos.
 * Se consulta la BD en cada petición para que un cambio de rol o una
 * desactivación de cuenta tengan efecto inmediato, sin esperar a que expire el token.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Token requerido"
        });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Token inválido"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = db
            .prepare("SELECT id, name, email, role, phone, is_active FROM users WHERE id = ?")
            .get(decoded.id);

        if (!user || !user.is_active) {
            return res.status(401).json({
                message: "Usuario no encontrado o inactivo"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Token inválido o expirado"
        });
    }
};

/**
 * Restringe una ruta a uno o varios roles.
 * Uso: router.post("/", authenticateToken, requireRole("admin", "coordinador"), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            message: "No tienes permisos para realizar esta acción"
        });
    }
    next();
};

/**
 * Igual que authenticateToken pero no exige token: si viene uno válido carga req.user,
 * si no, continúa como visitante. Se usa en rutas públicas que muestran más datos a un admin.
 */
const optionalAuth = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme === "Bearer" && token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = db
                .prepare("SELECT id, name, email, role, phone, is_active FROM users WHERE id = ?")
                .get(decoded.id);
            if (user && user.is_active) req.user = user;
        } catch {
            // token inválido: se trata como visitante
        }
    }
    next();
};

module.exports = authenticateToken;
module.exports.optionalAuth = optionalAuth;
module.exports.authenticateToken = authenticateToken;
module.exports.requireRole = requireRole;
