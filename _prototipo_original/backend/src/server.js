const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./config/database");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
    cors({
        origin: "http://localhost:3000"
    })
);

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Backend funcionando correctamente"
    });
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});