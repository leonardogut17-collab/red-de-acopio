const path = require("path");
const Database = require("better-sqlite3");

// La base de datos queda en la raíz de /backend, sin importar desde dónde se ejecute
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "..", "database.sqlite");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Roles disponibles en la plataforma
const ROLES = ["admin", "coordinador", "voluntario", "donante"];

// Categorías de insumos que se manejan en los centros
const CATEGORIES = ["alimentos", "agua", "higiene", "ropa", "medicamentos", "aseo", "cobijas", "otros"];

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'donante'
            CHECK (role IN ('admin', 'coordinador', 'voluntario', 'donante')),
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS centers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT 'Bogotá',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone TEXT,
        schedule TEXT,
        description TEXT,
        coordinator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS needs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL DEFAULT 'unidades',
        priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja')),
        status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cubierta')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
        donor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        donor_name TEXT,
        category TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL DEFAULT 'unidades',
        status TEXT NOT NULL DEFAULT 'prometida'
            CHECK (status IN ('prometida', 'recibida', 'cancelada')),
        notes TEXT,
        received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        received_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL DEFAULT 'unidades',
        beneficiary TEXT NOT NULL,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        slots INTEGER NOT NULL CHECK (slots > 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shift_signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (shift_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_needs_center ON needs(center_id);
    CREATE INDEX IF NOT EXISTS idx_donations_center ON donations(center_id);
    CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_center ON deliveries(center_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_center ON shifts(center_id);
`);

// Migración para bases creadas con el prototipo (tabla users sin rol)
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes("role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'donante'");
}
if (!userColumns.includes("phone")) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
}
if (!userColumns.includes("is_active")) {
    db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
}

console.log("Base de datos conectada");

module.exports = db;
module.exports.ROLES = ROLES;
module.exports.CATEGORIES = CATEGORIES;
