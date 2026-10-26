const express = require("express");
const rateLimit = require("express-rate-limit");

const {
    register,
    login,
    profile
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Limita intentos de login/registro para frenar ataques de fuerza bruta
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Demasiados intentos. Intenta de nuevo en unos minutos." }
});

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.get("/profile", authenticateToken, profile);

module.exports = router;
