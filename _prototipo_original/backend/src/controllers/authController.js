const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;

// REGISTRO
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Todos los campos son obligatorios"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "La contraseña debe tener mínimo 6 caracteres"
            });
        }

        const existingUser = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(email);

        if (existingUser) {
            return res.status(400).json({
                message: "El correo ya está registrado"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = db
            .prepare(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
            )
            .run(name, email, hashedPassword);

        const token = jwt.sign(
            {
                id: result.lastInsertRowid,
                email
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(201).json({
            message: "Usuario registrado correctamente",
            token,
            user: {
                id: result.lastInsertRowid,
                name,
                email
            }
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
            .get(email);

        if (!user) {
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

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login exitoso",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Error en el servidor"
        });
    }
};

module.exports = {
    register,
    login
};