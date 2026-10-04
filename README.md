# Bible Talks Tracker

Aplicación para dar seguimiento a estudios bíblicos: personas en estudio, grupos (charlas), agenda, comunicados, mensajes entre usuarios, guía de estudios y herramientas de administración.

- **Frontend:** React + TypeScript + Vite + Tailwind (`src/`)
- **Backend:** Node.js + Express + SQLite (`server/`), con inicio de sesión propio y actualizaciones en tiempo real (Server-Sent Events). No usa Firebase ni servicios externos.

## Desarrollo

```bash
npm install
npm run dev        # API en :3001 + Vite en :5173 (con proxy de /api)
```

La base de datos se crea automáticamente en `data/app.db`.

## Producción

```bash
npm install
npm run build      # genera dist/
npm start          # sirve la API y la app en el mismo puerto (PORT, por defecto 3001)
```

Variables de entorno:

| Variable        | Por defecto     | Descripción                        |
|-----------------|-----------------|------------------------------------|
| `PORT`          | `3001`          | Puerto del servidor                |
| `DATABASE_PATH` | `data/app.db`   | Ruta del archivo SQLite            |

> La app necesita un servidor Node que se mantenga encendido y un disco persistente para el archivo SQLite
> (Render, Railway, Fly.io, un VPS, etc.). Vercel solo ya no sirve, porque no ejecuta servidores persistentes.

Con Docker:

```bash
docker build -t bible-talks .
docker run -p 3000:3000 -v bible-talks-data:/data bible-talks
```

**Copias de seguridad:** basta con copiar el archivo de la base de datos (`DATABASE_PATH`).

## Primer administrador

La primera persona que entre en **Admin** cuando todavía no hay administradores puede asignarse ese rol. Después, los administradores gestionan los roles desde *Admin › Roles de Usuario*.

Como no hay envío de correos, la recuperación de contraseña la hace un administrador: *Admin › Roles de Usuario › Nueva contraseña* asigna una contraseña temporal, y la persona puede cambiarla luego en *Perfil › Editar Perfil*.

## Migrar los datos desde Firebase

1. En Firebase Console › Configuración del proyecto › Cuentas de servicio, genera una clave privada (archivo JSON). **No la subas al repositorio.**
2. Exporta los datos:
   ```bash
   npm install --no-save firebase-admin
   node scripts/export-firestore.mjs ruta/service-account.json firebase-export.json
   ```
3. Impórtalos en la base de datos SQLite (en el servidor donde corre la app, o copia luego `data/app.db`):
   ```bash
   npm run import-firebase -- firebase-export.json
   ```
4. Las contraseñas de Firebase no se pueden exportar. Cada usuario debe ir a **Registrarse** con su **mismo email**: se activa su cuenta migrada y conserva todos sus datos (personas, grupos, chats…).

El import conserva los IDs originales y se puede ejecutar más de una vez sin duplicar datos.
