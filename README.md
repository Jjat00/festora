# Festora

Herramienta profesional para que fotografos entreguen galerias y sus clientes seleccionen favoritas.

## Requisitos

- Node.js 18+
- Docker Desktop (con WSL integration si usas Windows)
- Cuenta de Google Cloud (para OAuth)

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completa las variables en `.env`:

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | URL de conexion a PostgreSQL |
| `AUTH_SECRET` | Secreto para Auth.js (`npx auth secret`) |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `R2_*` | Credenciales de Cloudflare R2 |

### 3. Base de datos

Levanta PostgreSQL con pgvector usando Docker:

```bash
docker compose up -d
```

Esto crea un contenedor con:
- **PostgreSQL 17** + pgvector
- **Usuario**: `festora`
- **Password**: `festora`
- **Base de datos**: `festora`
- **Puerto**: `5432`

Verificar que esta corriendo:

```bash
docker compose ps
```

Detener la base de datos:

```bash
docker compose down
```

> Los datos persisten en un volumen Docker. Para borrar todo incluyendo datos: `docker compose down -v`

### 4. Migraciones

```bash
npx prisma migrate dev
```

### 5. Servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos utiles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm run lint` | Ejecutar linter |
| `docker compose up -d` | Levantar base de datos |
| `docker compose down` | Detener base de datos |
| `npx prisma migrate dev` | Ejecutar migraciones |
| `npx prisma studio` | UI para explorar la base de datos |
