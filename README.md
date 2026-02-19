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

## Análisis con IA

Festora utiliza `festora-vision-api` como microservicio independiente para el análisis de fotos.

### festora-vision-api

Repositorio: https://github.com/Jjat00/festora-vision-api

El microservicio provee:
- **Fase 1**: blur detection, calidad técnica (BRISQUE), puntuación estética (NIMA)
- **Fase 2**: análisis de emociones con DeepFace
- **Fase 3.5**: análisis narrativo con LLM multimodal (Claude, GPT-4.1, Gemini)

Para correrlo localmente:

```bash
cd ../festora-vision-api
docker compose up --build
```

### Variables de entorno adicionales

| Variable | Descripción |
|----------|-------------|
| `VISION_API_URL` | URL del microservicio (ej. `http://localhost:8000`) |
| `VISION_API_KEY` | API key del microservicio (vacío = sin auth) |

Las API keys de los proveedores LLM (Anthropic, OpenAI, Gemini) se configuran en el **`.env` de festora-vision-api**, no en este proyecto.

### Funcionalidades IA del dashboard

- **Análisis técnico**: detecta blur, calidad y emociones. Se dispara manualmente por proyecto.
- **Análisis LLM**: evaluación narrativa con IA multimodal. Soporta:
  - Claude Sonnet 4.6 (~$0.006/foto)
  - GPT-4.1 (~$0.008/foto)
  - Gemini 2.0 Flash (~$0.001/foto)
- Los resultados incluyen score 1-10, composición, calidad de pose, puntos fuertes/débiles y resumen.
