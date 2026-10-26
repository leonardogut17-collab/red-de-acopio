const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Roles que un usuario puede elegir al registrarse.
// "coordinador" y "admin" solo los asigna un administrador.
const SELF_ASSIGNABLE_ROLES = ["donante", "voluntario"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null
});

const signToken = (user) =>
    jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );

// REGISTRO
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const role = req.body.role || "donante";

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Todos los campos son obligatorios"
            });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                message: "El correo no es válido"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener mínimo 8 caracteres"
            });
        }

        if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Solo puedes registrarte como donante o voluntario"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = db
            .prepare("SELECT id FROM users WHERE email = ?")
            .get(normalizedEmail);

        if (existingUser) {
            return res.status(400).json({
                message: "El correo ya está registrado"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = db
            .prepare(
                "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)"
            )
            .run(name.trim(), normalizedEmail, hashedPassword, role, phone?.trim() || null);

        const user = {
            id: Number(result.lastInsertRowid),
            name: name.trim(),
            email: normalizedEmail,
            role,
            phone: phone?.trim() || null
        };

        res.status(201).json({
            message: "Usuario registrado correctamente",
            token: signToken(user),
            user: publicUser(user)
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Error en el servidor"
        });
    }
};

// LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email y contraseña son obligatorios"
            });
        }

        const user = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(String(email).trim().toLowerCase());

        // Mismo mensaje para usuario inexistente y contraseña incorrecta (evita enumeración de usuarios)
        if (!user || !user.is_active) {
            return res.status(401).json({
                message: "Email o contraseña incorrectos"
            });
        }

        const passwordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Email o contraseña incorrectos"
            });
        }

        res.json({
            message: "Login exitoso",
            token: signToken(user),
            user: publicUser(user)
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Error en el servidor"
        });
    }
};

// PERFIL (usuario autenticado)
const profile = (req, res) => {
    res.json({
        message: "Acceso autorizado",
        user: publicUser(req.user)
    });
};

module.exports = {
    register,
    login,
    profile
};
