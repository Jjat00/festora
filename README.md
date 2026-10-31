# Festora

Galerías privadas para que fotógrafos entreguen las fotos de un evento o sesión: el cliente entra con un enlace protegido con PIN, marca favoritas y descarga los originales. Sitio público bilingüe (español e inglés) en [festora.studio](https://festora.studio).

## Funciones de la galería

| Función | Descripción |
| ------- | ----------- |
| **Galería con PIN** | Enlace público `/g/<slug>` con PIN opcional. El cliente navega, marca favoritas y el fotógrafo ve la selección en el dashboard. |
| **Descarga masiva** | El fotógrafo y el cliente descargan todas las fotos o solo las favoritas (y el fotógrafo, un álbum) con barra de progreso. El ZIP se arma **en el navegador** con `client-zip` a partir de URLs firmadas de R2, así que no hay límite de tamaño: con File System Access API se escribe directo a disco y, si no, se parte en trozos de 500 MB. |
| **Álbum colaborativo** | Si el proyecto lo activa (con fecha de cierre opcional), los invitados suben sus fotos desde la galería pública sin cuenta. El navegador las reduce antes de subir, cuentan contra la cuota del fotógrafo y hay un límite de fotos por hora por proyecto. |
| **Temas de galería** | Cada proyecto elige el estilo de su galería pública: `Festora (clásico)` o `Salvia` (boda en verde y crema, con flores). |
| **Plan gratuito** | 5 GB de almacenamiento por cuenta. |
| **Privacidad** | Página `/privacidad` que explica quién puede ver las fotos. |

## Features

Festora incluye **inteligencia artificial integrada** para mejorar el flujo de trabajo del fotógrafo y la experiencia del cliente:

| Feature                                  | Descripción                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Análisis de fotos con LLM multimodal** | Cada foto se evalúa con visión + lenguaje (Gemini 3.1 Flash Lite por defecto, GPT-4o, GPT-4o-mini, Gemini 2.0 Flash). Se obtiene: score 1–10, nitidez, composición, calidad de pose y fondo, puntos fuertes/débiles, resumen y razón de descarte si aplica. |
| **Categorización automática**            | Las fotos se etiquetan en categorías (ceremonia, retratos, pareja, grupo, familia, exterior, fiesta, etc.) y con tags (novia, novio, primer-baile, etc.) para organizar álbumes y filtrar en el dashboard.               |
| **Sugerencias de álbum**                 | A partir de las categorías detectadas, la IA genera nombres creativos para álbumes y propone una selección "highlights" (mejores fotos del proyecto).                                                                    |
| **Orden inteligente en la galería**      | Cuando el cliente marca favoritas, el orden de la galería se reordena según sus preferencias (tags, categorías, emociones y calidad) para mostrar primero las fotos más afines.                                          |
| **Frase de portada**                     | Generación de una frase poética para la portada de la galería según el tipo de proyecto (boda, XV años, retrato, etc.) y una idea opcional del fotógrafo.                                                                |
| **Búsqueda semántica de fotos**          | Búsqueda por texto natural ("novia bailando", "decoración de mesa") usando embeddings multimodales de **Gemini Embedding 2** (texto + imagen) y **pgvector**. Cada foto se describe primero con `gemini-3.1-flash-lite-preview` y la descripción y la imagen forman el embedding. Se genera solo en background al subir fotos (ver [Embeddings en background](#embeddings-en-background)). Disponible para fotógrafo (dashboard) y cliente (galería). |

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
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Para features de IA (ver [Análisis con IA](#análisis-con-ia))                                                                       |
| `GOOGLE_GENERATIVE_AI_API_KEY`                    | También se usa para **Gemini Embedding 2** (búsqueda semántica de fotos). La misma key del análisis IA sirve si el modelo está habilitado en tu Google Cloud. |
| `NEXT_PUBLIC_APP_URL`                             | URL pública de la app. En producción es el origen canónico (`https://festora.studio`); en cualquier otro host las páginas se sirven con `noindex`. |
| `CRON_SECRET`                                     | Protege `/api/cron/process-embeddings` (se envía como `Authorization: Bearer <CRON_SECRET>`). |
| `R2_ENDPOINT`                                     | Opcional. Apunta el cliente S3 a otro endpoint (p. ej. un S3 local para desarrollo) y activa path-style. |

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

> Prisma no ve el índice HNSW de pgvector y `migrate dev` añade `DROP INDEX "Photo_embedding_idx"` a cualquier migración nueva que toque `Photo`. Borra esa línea antes de commitear.

Para desarrollo local, pon los overrides en `.env.local` (ignorado por git), por ejemplo `DATABASE_URL` hacia el Postgres de Docker y `R2_ENDPOINT` hacia un S3 local. Prisma CLI no lee `.env.local`, así que pasa `DATABASE_URL` en línea a cada comando `prisma`.

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

- **Modelos**: Gemini 3.1 Flash Lite preview (por defecto), GPT-4o-mini, GPT-4o, Gemini 2.0 Flash, Gemini 2.0 Flash Lite.
- **Flujo**: En la página de fotos del proyecto puedes lanzar "Analizar con IA". Las fotos se envían en lotes al modelo; los resultados (score, categoría, tags, composición, etc.) se guardan en la base de datos.
- **Uso**: Categorías y tags en el dashboard (filtros, ordenación), sugerencias de álbum, orden inteligente en la galería pública y frase de portada.

Variables de entorno para la IA integrada (en el `.env` de este proyecto):

| Variable                       | Descripción                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`               | API key de OpenAI (para gpt-4o / gpt-4o-mini)                                                                    |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key de Google (para Gemini)                                                                                  |
| `AI_MODEL`                     | Modelo a usar: `gemini-3.1-flash-lite-preview`, `gpt-4o-mini`, `gpt-4o`, `gemini-2.0-flash`, `gemini-2.0-flash-lite` (por defecto: `gemini-3.1-flash-lite-preview`) |

### Embeddings en background

Los embeddings de búsqueda se generan sin que el fotógrafo tenga que lanzar nada. Cada foto pasa por `PENDING → QUEUED → DONE` (o `FAILED`) y se procesa por tres vías:

- Al confirmar la subida, como primera oportunidad.
- Mientras la página del proyecto está abierta, cada consulta de progreso procesa una foto pendiente y rescata las que quedaron atascadas en `QUEUED`.
- Con el cron `/api/cron/process-embeddings`, que procesa un lote pequeño de fotos pendientes o fallidas de cualquier proyecto y de paso limpia las subidas de invitados vencidas. `vercel.json` lo programa una vez al día (06:00 UTC, el máximo en Vercel Hobby); para más frecuencia se puede llamar desde un programador externo con el header `Authorization: Bearer <CRON_SECRET>`.

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
