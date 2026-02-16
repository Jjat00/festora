# Plan: Autenticacion Google OAuth para Festora

## Contexto

Festora es una landing page en Next.js 16 sin backend. Se necesita agregar autenticacion con Google (Gmail) como primera feature, redirigiendo usuarios autenticados a `/home`. Se usara PostgreSQL + Prisma como base de datos.

## Configuracion previa (manual del usuario)

Antes de implementar, necesitas:

1. **PostgreSQL corriendo** (local o remoto) con una base de datos creada para el proyecto
2. **Google Cloud Console** - Crear credenciales OAuth 2.0:
   - Ir a console.cloud.google.com > APIs & Services > Credentials
   - Crear OAuth 2.0 Client ID (tipo: Web application)
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copiar Client ID y Client Secret

## Paquetes a instalar

```bash
npm install next-auth@beta @auth/prisma-adapter @prisma/client
npm install -D prisma
```

## Archivos a crear/modificar

### Nuevos archivos (8)

| Archivo | Proposito |
|---------|-----------|
| `prisma/schema.prisma` | Schema con modelos User, Account, Session, VerificationToken |
| `.env.local` | Variables de entorno (DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET) |
| `src/lib/prisma.ts` | Singleton de PrismaClient (evita conexiones duplicadas en dev) |
| `src/auth.config.ts` | Config de providers (Edge-compatible, para middleware) |
| `src/auth.ts` | Config completa Auth.js con Prisma adapter y callbacks |
| `src/app/api/auth/[...nextauth]/route.ts` | API route handler para OAuth callbacks |
| `src/middleware.ts` | Proteccion de rutas (redirige `/home` a `/` si no autenticado) |
| `src/app/home/page.tsx` | Pagina protegida (muestra nombre, email y boton cerrar sesion) |

### Archivos a modificar (2)

| Archivo | Cambio |
|---------|--------|
| `src/app/page.tsx` | Botones "Acceder" y "Comenzar gratis" disparan sign-in con Google via Server Action |
| `next.config.ts` | Agregar `images.remotePatterns` para avatares de Google |

## Arquitectura

```
Landing (/) ──[click Acceder]──> Google OAuth ──> /home (protegida)
                                                      │
                                                [click Cerrar sesion]
                                                      │
                                                      v
                                                  Landing (/)
```

- **Auth.js v5** con estrategia JWT (compatible con Edge middleware)
- **Split config**: `auth.config.ts` (Edge) + `auth.ts` (Node.js con Prisma)
- **Middleware** solo en `/home/:path*` (evita conflictos con OAuth callbacks)
- **Server Actions** para sign-in/sign-out (sin logica auth en el cliente)

## Prisma Schema

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  accounts      Account[]
  sessions      Session[]
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

## Orden de implementacion

1. Instalar dependencias
2. Inicializar Prisma y escribir schema
3. Crear `.env.local` con variables de entorno
4. Ejecutar migracion (`npx prisma migrate dev --name init`)
5. Crear `src/lib/prisma.ts`
6. Crear `src/auth.config.ts`
7. Crear `src/auth.ts`
8. Crear `src/app/api/auth/[...nextauth]/route.ts`
9. Crear `src/middleware.ts`
10. Modificar `src/app/page.tsx` - wiring de botones con Server Actions
11. Crear `src/app/home/page.tsx`
12. Modificar `next.config.ts` - permitir imagenes de Google
13. Generar AUTH_SECRET (`npx auth secret`)

## Verificacion

1. `npm run build` - debe compilar sin errores
2. `npm run dev` - servidor de desarrollo
3. Visitar `/` - landing normal con botones funcionales
4. Click "Acceder" - redirige a Google OAuth
5. Tras login - redirige a `/home` con datos del usuario
6. Visitar `/home` sin auth - redirige a `/`
7. Click "Cerrar sesion" en `/home` - redirige a `/`
8. `npx prisma studio` - verificar registros en User/Account
