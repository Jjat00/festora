# Arquitectura Backend MVP - Festora

## Contexto

Festora es una herramienta profesional para que fotografos entreguen galerias y sus clientes seleccionen favoritas. El MVP tiene un solo flujo: fotografo crea evento -> sube fotos -> comparte link -> cliente marca favoritas -> fotografo exporta/descarga favoritas.

## Stack Tecnico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 16 App Router |
| Auth | Auth.js v5 + Google OAuth (solo fotografos) |
| ORM | Prisma |
| DB | PostgreSQL (Docker local, Vercel para prod) |
| Storage | Cloudflare R2 (S3-compatible) |
| Deploy | Vercel |

## Modelo de Datos (Prisma)

```
User (Auth.js) ──1:N──> Event ──1:N──> Photo ──1:1──> Selection
```

- **User**: Fotografo. Modelos Auth.js (User, Account, Session, VerificationToken)
- **Event**: `name, clientName, date, slug (unique), pin? (bcrypt), coverKey?, status (DRAFT|ACTIVE|LOCKED|ARCHIVED), selectionDeadline?`
- **Photo**: `eventId, objectKey, thumbnailKey?, originalFilename, order, width?, height?, size`
- **Selection**: `eventId, photoId (unique)` - join table simple. MVP = 1 cliente por evento, selecciones pertenecen al evento

**Decision clave**: El cliente NO es un usuario en la DB. Las selecciones se guardan por evento, no por sesion/cookie. Cualquier persona con el link (y PIN) es "el cliente". Esto permite seleccionar desde multiples dispositivos sin perder consistencia.

### Schema Prisma Completo

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Auth.js v5 Models
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  events        Event[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
  @@unique([identifier, token])
}

// Festora Business Models
model Event {
  id                String      @id @default(cuid())
  userId            String
  name              String
  clientName        String
  date              DateTime
  slug              String      @unique
  pin               String?
  coverKey          String?
  status            EventStatus @default(ACTIVE)
  selectionDeadline DateTime?
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  photos            Photo[]
  selections        Selection[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  @@index([userId])
  @@index([slug])
}

model Photo {
  id               String     @id @default(cuid())
  eventId          String
  objectKey        String
  thumbnailKey     String?
  originalFilename String
  order            Int
  width            Int?
  height           Int?
  size             Int
  event            Event      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  selection        Selection?
  createdAt        DateTime   @default(now())
  @@index([eventId])
  @@index([eventId, order])
}

model Selection {
  id        String   @id @default(cuid())
  eventId   String
  photoId   String   @unique
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  photo     Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@unique([eventId, photoId])
  @@index([eventId])
}

enum EventStatus {
  DRAFT
  ACTIVE
  LOCKED
  ARCHIVED
}
```

## Estructura de Rutas

```
PUBLICAS:
  /                    Landing page (existente)
  /e/[slug]            Galeria del cliente
  /e/[slug]/pin        Entrada de PIN (si aplica)

PROTEGIDAS (auth requerida):
  /dashboard           Lista de eventos, stats
  /events/new          Crear evento
  /events/[eventId]    Dashboard del evento
  /events/[eventId]/photos      Subir/gestionar fotos
  /events/[eventId]/settings    Configuracion (PIN, deadline, slug)
  /events/[eventId]/selections  Ver favoritas, exportar, descargar

API:
  /api/auth/[...nextauth]          Auth.js handlers
  /api/upload/presign              Presigned URLs para R2
  /api/events/[eventId]/download   Descargar favoritas (ZIP)
```

## Estructura de Carpetas

```
src/
  app/
    (dashboard)/              # Route group protegido
      layout.tsx              # Shell: sidebar, nav, auth check
      dashboard/page.tsx
      events/
        new/page.tsx
        [eventId]/
          page.tsx
          photos/page.tsx
          settings/page.tsx
          selections/page.tsx
    e/[slug]/                 # Galeria publica
      page.tsx
      pin/page.tsx
    api/
      auth/[...nextauth]/route.ts
      upload/presign/route.ts
      events/[eventId]/download/route.ts
    layout.tsx                # Root layout (existente)
    page.tsx                  # Landing (existente)
  lib/
    prisma.ts                 # Singleton PrismaClient
    r2.ts                     # Cliente R2, presigned URLs, signed URLs
    slug.ts                   # Generacion de slugs unicos
    pin.ts                    # Hash/verificacion de PIN (bcrypt)
    constants.ts              # Constantes (max file size, etc.)
    types.ts                  # Tipos compartidos
  lib/actions/
    event-actions.ts          # createEvent, updateEvent, deleteEvent, lockEvent
    photo-actions.ts          # confirmUpload, deletePhoto, reorderPhotos
    selection-actions.ts      # toggleSelection
  auth.config.ts              # Config providers (Edge-compatible)
  auth.ts                     # Config completa Auth.js + Prisma adapter
  middleware.ts               # Proteccion de rutas
  components/
    dashboard/                # Componentes del dashboard
    gallery/                  # Componentes de galeria publica
```

## Server Actions

```
Fotografo (requieren auth):
  createEvent(formData)              -> { event, slug }
  updateEvent(eventId, data)         -> { event }
  deleteEvent(eventId)               -> void
  lockEvent(eventId)                 -> void
  confirmUpload(eventId, uploads[])  -> { photos[] }
  deletePhoto(photoId)               -> void
  reorderPhotos(eventId, photoIds[]) -> void
  exportSelections(eventId)          -> { selectedPhotoIds[] }

Cliente (sin auth, requiere slug valido):
  toggleSelection(eventId, photoId)  -> { selected, totalSelected }
```

## API Routes

```
POST /api/upload/presign
  Auth: requerida
  Body: { eventId, files: [{ filename, contentType }] }
  Returns: { presignedUrls: [{ objectKey, uploadUrl }] }

GET /api/events/[eventId]/download?type=favorites|all
  Auth: requerida
  Returns: ZIP stream

POST /api/events/[slug]/verify-pin
  Auth: ninguna
  Body: { pin }
  Returns: set httpOnly cookie + redirect
```

## Flujo de Subida de Fotos (R2)

```
1. Fotografo selecciona archivos (client-side, validacion tipo/tamano)
2. POST /api/upload/presign -> genera presigned PUT URLs para R2
3. Upload directo a R2 desde el browser (6 concurrentes, progress bar)
4. Thumbnails generados client-side (canvas resize 800px, WebP)
5. Server Action confirmUpload() -> crea registros Photo en DB
```

Estructura R2: `{userId}/{eventId}/originals/{photoId}.ext` y `.../thumbnails/{photoId}.webp`

## Flujo de Acceso del Cliente

```
1. Visita /e/[slug]
2. Si tiene PIN -> verifica cookie "festora_pin_{slug}" (JWT httpOnly)
3. Si no hay cookie valida -> redirige a /e/[slug]/pin
4. PIN verificado -> set cookie (7 dias) -> muestra galeria
5. Galeria con fotos (signed URLs), toggle favoritas (Server Action)
6. Contador: "Has seleccionado 23 fotos"
```

## Dependencias Nuevas

```
Produccion:
  next-auth@beta, @auth/prisma-adapter, @prisma/client
  @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
  bcryptjs, jose

Dev:
  prisma, @types/bcryptjs
```

## Variables de Entorno

```
DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
NEXT_PUBLIC_APP_URL
```

## Fases de Implementacion

| Fase | Alcance |
|------|---------|
| 1. Foundation | Prisma schema + migracion, Auth.js + Google OAuth, middleware |
| 2. Core CRUD | Crear/listar/editar/eliminar eventos, dashboard basico |
| 3. Photos | R2 setup, presigned URLs, upload zone, photo grid |
| 4. Gallery | Ruta publica /e/[slug], PIN, toggle favoritas, contador |
| 5. Export | Exportar IDs, descargar favoritas, deadline, lock |

## Verificacion

1. `npm run build` compila sin errores
2. Auth: login con Google -> redirect a /dashboard
3. CRUD: crear evento -> aparece en dashboard -> editar -> eliminar
4. Upload: subir fotos -> aparecen en grid -> thumbnails visibles
5. Gallery: visitar /e/[slug] -> ver fotos -> marcar favoritas -> contador actualiza
6. PIN: evento con PIN -> pide PIN -> acceso correcto
7. Export: exportar IDs -> CSV correcto. Descargar favoritas -> ZIP correcto
8. Deadline: pasada la fecha -> favoritas bloqueadas

## Escalabilidad Futura (no MVP)

- **Watermarks**: Cloudflare Image Transformations en read-time
- **Albums**: Modelo Album con albumId en Photo
- **Multi-cliente**: Modelo ClientSession, Selection con clientSessionId
- **Cuentas de cliente**: Email + magic link
- **Uploads colaborativos**: Modelo Collaborator con roles (OWNER, EDITOR, VIEWER)
- **Analytics**: viewCount, selectionChanges por evento
