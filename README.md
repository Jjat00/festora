# Festora

Herramienta profesional para que fotógrafos entreguen galerías y sus clientes seleccionen favoritas.

## Features

Festora incluye **inteligencia artificial integrada** para mejorar el flujo de trabajo del fotógrafo y la experiencia del cliente:

| Feature                                  | Descripción                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Análisis de fotos con LLM multimodal** | Cada foto se evalúa con visión + lenguaje (GPT-4o, GPT-4o-mini, Gemini 2.0 Flash). Se obtiene: score 1–10, nitidez, composición, calidad de pose y fondo, puntos fuertes/débiles, resumen y razón de descarte si aplica. |
| **Categorización automática**            | Las fotos se etiquetan en categorías (ceremonia, retratos, pareja, grupo, familia, exterior, fiesta, etc.) y con tags (novia, novio, primer-baile, etc.) para organizar álbumes y filtrar en el dashboard.               |
| **Sugerencias de álbum**                 | A partir de las categorías detectadas, la IA genera nombres creativos para álbumes y propone una selección "highlights" (mejores fotos del proyecto).                                                                    |
| **Orden inteligente en la galería**      | Cuando el cliente marca favoritas, el orden de la galería se reordena según sus preferencias (tags, categorías, emociones y calidad) para mostrar primero las fotos más afines.                                          |
| **Frase de portada**                     | Generación de una frase poética para la portada de la galería según el tipo de proyecto (boda, XV años, retrato, etc.) y una idea opcional del fotógrafo.                                                                |

La IA se ejecuta en la app con **Vercel AI SDK** y modelos multimodales (OpenAI, Google). Opcionalmente puedes usar el microservicio **festora-vision-api** para análisis técnico adicional (blur, calidad BRISQUE/NIMA, emociones con DeepFace). Ver [Análisis con IA](#análisis-con-ia) más abajo.

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

| Variable                                          | Descripcion                                                   |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                                    | URL de conexion a PostgreSQL                                  |
| `AUTH_SECRET`                                     | Secreto para Auth.js (`npx auth secret`)                      |
| `AUTH_GOOGLE_ID`                                  | Google OAuth Client ID                                        |
| `AUTH_GOOGLE_SECRET`                              | Google OAuth Client Secret                                    |
| `R2_*`                                            | Credenciales de Cloudflare R2                                 |
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Para features de IA (ver [Análisis con IA](#análisis-con-ia)) |

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

| Comando                  | Descripcion                       |
| ------------------------ | --------------------------------- |
| `npm run dev`            | Servidor de desarrollo            |
| `npm run build`          | Build de produccion               |
| `npm run lint`           | Ejecutar linter                   |
| `docker compose up -d`   | Levantar base de datos            |
| `docker compose down`    | Detener base de datos             |
| `npx prisma migrate dev` | Ejecutar migraciones              |
| `npx prisma studio`      | UI para explorar la base de datos |

## Análisis con IA

### IA integrada (Vercel AI SDK)

El análisis de fotos con LLM multimodal corre **dentro de esta app**. No necesitas servicios externos para usar las features de IA.

- **Modelos**: GPT-4o-mini (por defecto), GPT-4o, Gemini 2.0 Flash, Gemini 2.0 Flash Lite.
- **Flujo**: En la página de fotos del proyecto puedes lanzar "Analizar con IA". Las fotos se envían en lotes al modelo; los resultados (score, categoría, tags, composición, etc.) se guardan en la base de datos.
- **Uso**: Categorías y tags en el dashboard (filtros, ordenación), sugerencias de álbum, orden inteligente en la galería pública y frase de portada.

Variables de entorno para la IA integrada (en el `.env` de este proyecto):

| Variable                       | Descripción                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`               | API key de OpenAI (para gpt-4o / gpt-4o-mini)                                                                    |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key de Google (para Gemini)                                                                                  |
| `AI_MODEL`                     | Modelo a usar: `gpt-4o-mini`, `gpt-4o`, `gemini-2.0-flash`, `gemini-2.0-flash-lite` (por defecto: `gpt-4o-mini`) |

### festora-vision-api (opcional)

Para análisis técnico adicional (blur, calidad BRISQUE/NIMA, emociones con DeepFace), puedes usar el microservicio **festora-vision-api**.

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

Variables de entorno para el microservicio (en el `.env` de este proyecto):

| Variable         | Descripción                                         |
| ---------------- | --------------------------------------------------- |
| `VISION_API_URL` | URL del microservicio (ej. `http://localhost:8000`) |
| `VISION_API_KEY` | API key del microservicio (vacío = sin auth)        |

Las API keys de los proveedores LLM usados por **festora-vision-api** se configuran en el `.env` de ese repositorio, no aquí.
