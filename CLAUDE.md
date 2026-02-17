# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build` (also runs `prisma generate`)
- **Lint**: `npm run lint`
- **Database up**: `docker compose up -d`
- **Database down**: `docker compose down`
- **Migrations**: `npx prisma migrate dev`
- **Prisma Studio**: `npx prisma studio`

There is no test suite configured.

## Architecture

Festora is a photographer gallery SaaS. Photographers create projects, upload photos to Cloudflare R2, and share a public gallery link with clients. Clients can browse photos and mark selections. Two distinct user experiences:

- **Photographer side** (`(dashboard)/` route group): Authenticated, full CRUD via Server Actions
- **Client side** (`/g/[slug]`): Public, read-only, optional PIN protection

### Key Design Decisions

**Upload flow**: Client-side direct upload to R2 via presigned URLs (`/api/upload/presign`). Thumbnails are generated client-side (canvas, max 800px) and uploaded separately. Server only stores metadata after upload via `confirmUpload` Server Action.

**Auth split**: Auth.js v5 config is split into `src/auth.config.ts` (edge-safe, no Prisma) and `src/auth.ts` (full config with PrismaAdapter). Middleware uses the edge-safe config.

**Photo delivery**: Photos are never served directly from R2 public URLs. All image access goes through API routes (`/api/photo/[id]/thumbnail`, `/api/photo/[id]/view`, `/api/photo/[id]/download`) that generate short-lived presigned URLs.

**PIN protection**: PINs are bcrypt-hashed in the DB. On verify, a JWT is issued and stored as an HttpOnly cookie (7-day expiry). Subsequent gallery visits validate the cookie without hitting the DB.

### Storage Layout (R2)

```
{userId}/{projectId}/originals/{photoId}.{ext}
{userId}/{projectId}/thumbnails/{photoId}.webp
```

### Route Structure

```
src/app/
├── (dashboard)/          # Auth-protected route group
│   ├── layout.tsx        # Auth guard + nav shell
│   ├── dashboard/        # Projects list
│   └── projects/[projectId]/
│       ├── page.tsx      # Overview
│       ├── photos/       # Upload + manage
│       ├── settings/     # Project settings + slug/PIN
│       └── selections/   # View client selections + ZIP download
├── g/[slug]/             # Public gallery
│   ├── page.tsx          # Gallery view or redirect to /pin
│   └── pin/              # PIN entry
├── api/
│   ├── auth/[...nextauth]/
│   ├── upload/presign/
│   ├── photo/[id]/{thumbnail,view,download}/
│   ├── projects/[projectId]/download/   # ZIP of selected photos
│   └── g/[slug]/verify-pin/
└── page.tsx              # Landing page
```

### Server Actions

All data mutations go through Server Actions in `src/lib/actions/`:
- `project-actions.ts`: createProject, updateProject, deleteProject, lockProject, getProject, getUserProjects
- `photo-actions.ts`: confirmUpload, deletePhoto, reorderPhotos, getProjectPhotos
- `selection-actions.ts`: toggleSelection
- `storage-actions.ts`: Storage usage utilities

### Database Schema (Prisma)

Core models: `User` → `Project` → `Photo` → `Selection` (all cascade on delete). `Project.slug` is a unique 8-char alphanumeric string. `Project.pin` stores bcrypt hash. `Photo.order` controls gallery display order. `Selection` is unique per `(projectId, photoId)`.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| React | v19 with React Compiler |
| Styling | Tailwind CSS v4 (PostCSS) |
| ORM | Prisma 6 |
| Database | PostgreSQL 17 + pgvector (Docker) |
| Auth | Auth.js v5 (Google OAuth, JWT sessions) |
| Storage | Cloudflare R2 via AWS SDK v3 |
| Linting | ESLint 9 flat config |

### Environment Variables

See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_APP_URL`.

Generate `AUTH_SECRET` with: `npx auth secret`

### Conventions

- Path alias `@/*` maps to `./src/*`
- Dark/light mode via CSS custom properties (`--background`, `--foreground`, `--muted`, `--border`, `--accent`) and `prefers-color-scheme`
- Fonts: Urbanist (UI) + Geist Mono (monospace)
- UI text is in Spanish
