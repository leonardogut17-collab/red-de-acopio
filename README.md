# Red de Acopio

Plataforma web para coordinar **centros de acopio**: qué necesita cada centro, las donaciones que llegan, el inventario disponible, las entregas a beneficiarios y los turnos de voluntariado.

El proyecto parte del prototipo (backend Express + SQLite con login JWT) y reutiliza el diseño, la autenticación del frontend, el layout y la idea del mapa del proyecto **Sitial**, adaptados al dominio de acopio.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Backend | Node.js 20+, Express 5, better-sqlite3, JWT, bcryptjs, helmet, express-rate-limit |
| Frontend | React 18, TypeScript, Vite, React Router, Leaflet + OpenStreetMap, lucide-react |
| Datos | SQLite (archivo `App/backend/database.sqlite`, se crea solo) |

> El mapa usa **OpenStreetMap** con Leaflet, así que **no necesita clave de Google Maps** (a diferencia de Sitial).

## Identidad visual

El logo está en `App/frontend/public/assets/images/logo.png` (y `favicon.png`). Los colores se definen en `App/frontend/src/styles/tokens.css`:

| Color | Hex | Uso |
| --- | --- | --- |
| Espresso | `#542916` | Color principal: botones, menú lateral, encabezado y footer |
| Eau trouble | `#b79858` | Tonos arena: bordes y etiquetas de prioridad baja |
| Terre cuite | `#a13a1e` | Necesidades urgentes y acciones de peligro |
| Bleu porcelaine | `#88b8ce` | Estados positivos (donación recibida) e información |
| Nuage de lait | `#fefaf0` | Fondo de la aplicación |
| Miel doré | `#f1c166` | Acentos sobre fondos oscuros y centro seleccionado en el mapa |

## Roles

| Rol | Cómo se obtiene | Qué puede hacer |
| --- | --- | --- |
| **Donante** | Se registra solo | Ver centros y necesidades, registrar donaciones (quedan "por entregar") y cancelarlas |
| **Voluntario** | Se registra solo | Lo mismo que el donante + inscribirse y cancelar inscripción en turnos |
| **Coordinador** | Lo asigna un admin | Gestionar **sus** centros: necesidades, recibir donaciones, inventario, entregas y turnos |
| **Admin** | `npm run seed` | Todo lo anterior en todos los centros + crear/eliminar centros, asignar coordinadores y cambiar roles |

Al registrarse solo se puede elegir donante o voluntario. Los roles de coordinador y admin solo los asigna un administrador, y el backend también lo valida.

## Estructura

```text
.
└── App/
    ├── backend/
    └── frontend/
```

Detalle de cada carpeta:

```text
App/
├── backend/
│   ├── src/
│   │   ├── config/database.js        # Conexión SQLite y creación de tablas
│   │   ├── controllers/              # Lógica de cada módulo
│   │   │   ├── authController.js     # Registro, login, perfil
│   │   │   ├── centerController.js   # Centros + inventario
│   │   │   ├── needController.js     # Necesidades
│   │   │   ├── donationController.js # Donaciones
│   │   │   ├── deliveryController.js # Entregas (salidas de inventario)
│   │   │   ├── shiftController.js    # Turnos e inscripciones
│   │   │   ├── userController.js     # Gestión de usuarios (admin)
│   │   │   └── statsController.js    # Cifras generales
│   │   ├── middleware/authMiddleware.js  # authenticateToken, optionalAuth, requireRole
│   │   ├── routes/                   # Un archivo de rutas por módulo
│   │   ├── utils/http.js             # Validaciones y permisos por centro
│   │   ├── seed.js                   # Admin inicial + datos de ejemplo
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/assets/images/
│   ├── src/
│   │   ├── components/   # AppShell, mapa, modales, header/footer públicos
│   │   ├── context/      # AuthContext (sesión y roles)
│   │   ├── hooks/        # useAuth, useLoad
│   │   ├── lib/          # Cliente de la API y etiquetas
│   │   ├── pages/        # Landing, Login, Register, Dashboard, Centros, Necesidades,
│   │   │                 # Donaciones, Inventario, Turnos, Usuarios
│   │   ├── styles/
│   │   └── types/
│   └── package.json
└── README.md
```

## Cómo ejecutarlo

Necesitas **Node.js 20 o superior**.

### 1. Backend (puerto 4000)

```bash
cd App/backend
npm install
```

Crea el archivo `.env` a partir del ejemplo y cambia `JWT_SECRET`:

```bash
# Windows (PowerShell)
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Para generar un secreto seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crea el administrador y los datos de ejemplo, y arranca el servidor:

```bash
npm run seed
npm run dev
```

### 2. Frontend (puerto 3000)

En otra terminal:

```bash
cd App/frontend
npm install
npm run dev
```

Abre <http://localhost:3000>. En desarrollo, Vite reenvía las peticiones `/api` al backend (`localhost:4000`).

### Usuarios de prueba (creados por `npm run seed`)

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Admin | admin@redacopio.co | Admin12345 (o la de `ADMIN_PASSWORD` en `.env`) |
| Coordinador | coordinador@redacopio.co | Coord12345 |
| Voluntario | voluntario@redacopio.co | Volun12345 |
| Donante | donante@redacopio.co | Donan12345 |

> Cambia o elimina estas cuentas antes de publicar la aplicación.

Para empezar con la base de datos vacía, borra `App/backend/database.sqlite*` y vuelve a ejecutar `npm run seed`.

## API

Todas las rutas empiezan por `/api`. 🔒 = requiere `Authorization: Bearer <token>`.

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/auth/register` · `/auth/login` | Público (máx. 20 intentos cada 15 min) |
| GET | `/auth/profile` | 🔒 Cualquier rol |
| GET | `/stats` | Público |
| GET | `/centers` · `/centers/:id` | Público |
| GET | `/centers/mine` · `/centers/:id/inventory` | 🔒 Admin, coordinador |
| POST / DELETE | `/centers` · `/centers/:id` | 🔒 Admin |
| PUT | `/centers/:id` | 🔒 Admin o coordinador del centro |
| GET | `/needs?centerId=&category=&status=` | Público |
| POST / PUT / DELETE | `/needs` · `/needs/:id` | 🔒 Admin o coordinador del centro |
| GET | `/donations/mine` | 🔒 Cualquier rol |
| GET | `/donations?centerId=&status=` | 🔒 Admin, coordinador (solo sus centros) |
| POST | `/donations` | 🔒 Cualquier rol (`status: "recibida"` solo coordinador del centro) |
| PATCH | `/donations/:id/receive` | 🔒 Admin o coordinador del centro |
| PATCH | `/donations/:id/cancel` | 🔒 Donante dueño o coordinador del centro |
| GET / POST | `/deliveries?centerId=` · `/deliveries` | 🔒 Admin o coordinador del centro |
| GET | `/shifts` · `/shifts/mine` | 🔒 Cualquier rol |
| POST / DELETE | `/shifts` · `/shifts/:id` | 🔒 Admin o coordinador del centro |
| GET | `/shifts/:id/volunteers` | 🔒 Admin o coordinador del centro |
| POST / DELETE | `/shifts/:id/signup` | 🔒 Voluntario |
| GET / PATCH | `/users` · `/users/:id` | 🔒 Admin |

**Inventario:** se calcula como *donaciones recibidas − entregas*, agrupado por categoría, insumo y unidad. El backend no deja registrar una entrega mayor a las existencias.

## Seguridad

- Contraseñas con **bcrypt** (10 rondas) y mínimo 8 caracteres.
- **JWT** firmado con `JWT_SECRET`; el servidor no arranca si falta.
- En cada petición el usuario se vuelve a leer de la base de datos, así que un cambio de rol o una cuenta desactivada surten efecto de inmediato.
- Autorización por rol (`requireRole`) y por centro (solo el coordinador asignado o un admin).
- Mismo mensaje para "usuario no existe" y "contraseña incorrecta", para no revelar qué correos están registrados.
- **Rate limiting** en login y registro, cabeceras seguras con **helmet**, CORS restringido a `CORS_ORIGIN` y cuerpo JSON limitado a 100 KB.
- Todas las consultas usan sentencias preparadas (`?`), lo que evita inyección SQL.
- Las inscripciones a turnos usan una transacción para que nunca se superen los cupos.

## Cambios respecto al prototipo

- `users` ahora tiene `role`, `phone` e `is_active`. Si ya tenías un `database.sqlite` del prototipo, las columnas se agregan solas al arrancar.
- `authController`: el registro acepta `role` (donante/voluntario), el token incluye el rol, el correo se normaliza en minúsculas y la contraseña mínima pasa a 8 caracteres.
- `authMiddleware`: además de `authenticateToken`, ahora exporta `requireRole` y `optionalAuth`.
- `server.js`: agrega helmet, manejador global de errores, 404 en JSON y las nuevas rutas.
- Nuevas tablas: `centers`, `needs`, `donations`, `deliveries`, `shifts` y `shift_signups`.
