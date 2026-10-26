/**
 * Crea el administrador inicial y datos de ejemplo.
 * Uso: npm run seed
 *
 * Es seguro ejecutarlo varias veces: no duplica usuarios y solo crea
 * los centros de ejemplo si la tabla de centros está vacía.
 */
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/database");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@redacopio.co").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345";

const upsertUser = (name, email, password, role, phone = null) => {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return existing.id;
    const hash = bcrypt.hashSync(password, 10);
    return Number(
        db.prepare("INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)")
            .run(name, email, hash, role, phone).lastInsertRowid
    );
};

const adminId = upsertUser("Administrador", ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
const coordId = upsertUser("Laura Coordinadora", "coordinador@redacopio.co", "Coord12345", "coordinador", "3001234567");
upsertUser("Andrés Voluntario", "voluntario@redacopio.co", "Volun12345", "voluntario", "3109876543");
const donorId = upsertUser("Camila Donante", "donante@redacopio.co", "Donan12345", "donante");

const centersCount = db.prepare("SELECT COUNT(*) AS n FROM centers").get().n;

if (centersCount === 0) {
    const insertCenter = db.prepare(`
        INSERT INTO centers (name, address, city, latitude, longitude, phone, schedule, description, coordinator_id)
        VALUES (?, ?, 'Bogotá', ?, ?, ?, ?, ?, ?)
    `);
    const insertNeed = db.prepare(`
        INSERT INTO needs (center_id, category, item, quantity, unit, priority) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertDonation = db.prepare(`
        INSERT INTO donations (center_id, donor_id, donor_name, category, item, quantity, unit, status, received_by, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertShift = db.prepare(`
        INSERT INTO shifts (center_id, title, description, date, start_time, end_time, slots)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const inDays = (n) => {
        const d = new Date();
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
    };

    db.transaction(() => {
        const c1 = insertCenter.run(
            "Centro de Acopio Kennedy", "Cra. 78 #38-20 Sur", 4.6280, -74.1530, "6014567890",
            "Lun a Sáb, 8:00 a.m. – 6:00 p.m.", "Punto principal de recepción para el suroccidente de la ciudad.", coordId
        ).lastInsertRowid;
        const c2 = insertCenter.run(
            "Centro de Acopio Chapinero", "Calle 57 #9-15", 4.6440, -74.0640, "6017654321",
            "Lun a Vie, 9:00 a.m. – 5:00 p.m.", "Recibe principalmente ropa, cobijas y artículos de higiene.", coordId
        ).lastInsertRowid;
        const c3 = insertCenter.run(
            "Centro de Acopio Suba", "Av. Suba #127-40", 4.7230, -74.0850, null,
            "Mar a Dom, 7:00 a.m. – 3:00 p.m.", "Atiende a las familias del norte de la ciudad.", null
        ).lastInsertRowid;

        insertNeed.run(c1, "agua", "Agua potable en botella", 300, "litros", "alta");
        insertNeed.run(c1, "alimentos", "Arroz", 150, "kg", "alta");
        insertNeed.run(c1, "higiene", "Pañales talla 3", 80, "paquetes", "media");
        insertNeed.run(c2, "cobijas", "Cobijas térmicas", 60, "unidades", "alta");
        insertNeed.run(c2, "ropa", "Ropa de abrigo para niños", 100, "prendas", "media");
        insertNeed.run(c3, "medicamentos", "Botiquines básicos", 40, "unidades", "media");
        insertNeed.run(c3, "aseo", "Jabón de ropa", 50, "kg", "baja");

        const now = new Date().toISOString();
        insertDonation.run(c1, donorId, null, "alimentos", "Arroz", 40, "kg", "recibida", coordId, now);
        insertDonation.run(c1, null, "Tienda El Vecino", "agua", "Agua potable en botella", 120, "litros", "recibida", coordId, now);
        insertDonation.run(c1, donorId, null, "higiene", "Pañales talla 3", 10, "paquetes", "prometida", null, null);
        insertDonation.run(c2, donorId, null, "cobijas", "Cobijas térmicas", 15, "unidades", "prometida", null, null);

        insertShift.run(c1, "Clasificación de alimentos", "Separar y empacar mercados por familia.", inDays(2), "08:00", "12:00", 6);
        insertShift.run(c1, "Recepción de donaciones", "Recibir y registrar las donaciones que lleguen.", inDays(3), "13:00", "17:00", 4);
        insertShift.run(c2, "Organización de ropa", "Clasificar ropa por talla y tipo.", inDays(5), "09:00", "13:00", 5);
    })();

    console.log("Centros, necesidades, donaciones y turnos de ejemplo creados");
}

console.log("\nUsuarios disponibles:");
console.log(`  admin        ${ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD ? "(la de tu .env)" : ADMIN_PASSWORD}`);
console.log("  coordinador  coordinador@redacopio.co / Coord12345");
console.log("  voluntario   voluntario@redacopio.co / Volun12345");
console.log("  donante      donante@redacopio.co / Donan12345");
console.log(`\n(admin id: ${adminId})`);
