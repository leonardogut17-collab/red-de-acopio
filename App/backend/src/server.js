require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

if (!process.env.JWT_SECRET) {
    console.error("Falta la variable JWT_SECRET en el archivo .env (mira .env.example)");
    process.exit(1);
}

require("./config/database");

const authRoutes = require("./routes/authRoutes");
const centerRoutes = require("./routes/centerRoutes");
const needRoutes = require("./routes/needRoutes");
const donationRoutes = require("./routes/donationRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const userRoutes = require("./routes/userRoutes");
const statsRoutes = require("./routes/statsRoutes");

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",")
    })
);

app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
    res.json({
        message: "Backend funcionando correctamente"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/centers", centerRoutes);
app.use("/api/needs", needRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador global de errores (Express 5 captura también los errores de funciones async)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "JSON inválido" });
    }
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
        message: status >= 500 ? "Error en el servidor" : err.message
    });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
