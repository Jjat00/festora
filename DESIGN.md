# Festora — Design System

Sistema de diseño de la plataforma. La fuente de verdad son los tokens definidos en `src/app/globals.css` y la configuración de fuentes en `src/app/layout.tsx`. Este documento describe el lenguaje visual, los componentes base y las convenciones de uso.

---

## 1. Filosofía

Festora es una plataforma para fotógrafos. La interfaz debe **desaparecer** para que la fotografía sea protagonista. Por eso el sistema es deliberadamente:

- **Monocromático** — la paleta principal es blanco / negro / grises neutros. El color se reserva para señales semánticas (éxito, advertencia, error) y nunca compite con las imágenes del cliente.
- **Tipográfico antes que decorativo** — jerarquía resuelta con peso y tamaño, no con cajas, sombras ni bordes pesados.
- **Ligero por defecto** — `font-weight: 300` en body, mucho `text-muted-foreground`, bordes sutiles (`border/60`), radios generosos.
- **Adaptativo** — light y dark mode son ciudadanos de primera clase vía `prefers-color-scheme` y custom properties.
- **Idioma** — toda la UI está en Español.

Si una decisión de diseño compite con una foto del cliente, la decisión está mal.

---

## 2. Tipografía

### Familias

| Rol | Fuente | Variable CSS | Carga |
|-----|--------|--------------|-------|
| Sans (UI) | **Urbanist** | `--font-urbanist` / `--font-sans` | `next/font/google` |
| Mono | **Geist Mono** | `--font-geist-mono` / `--font-mono` | `next/font/google` |

Urbanist se carga con pesos `200, 300, 400, 500, 600`. No usar `700+`: rompe la sensación de ligereza del sistema.

```ts
// src/app/layout.tsx
const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
});
```

### Pesos — uso

| Peso | Token Tailwind | Uso |
|------|----------------|-----|
| 200 | `font-extralight` | Reservado, grandes desplegados decorativos |
| **300** | `font-light` | **Default del body**, párrafos largos, texto secundario |
| 400 | `font-normal` | Texto neutro, inputs |
| 500 | `font-medium` | Botones, links activos, valores numéricos clave, headings sutiles |
| 600 | `font-semibold` | Títulos de tarjeta (`h3`), nombre de marca en navs |

### Escala (basada en `text-*` de Tailwind v4)

| Token | Tamaño | Uso típico |
|-------|--------|------------|
| `text-[11px]` | 11px | Eyebrow / badge en uppercase tracking-widest |
| `text-xs` | 12px | Metadatos, contadores, badges, hints |
| `text-sm` | 14px | Texto base de UI: botones, formularios, navegación, body de tarjetas |
| `text-base` | 16px | Párrafos largos en landing |
| `text-lg` | 18px | Subtítulos en landing, marca en nav |
| `text-3xl` | 30px | H2 móvil |
| `text-4xl` | 36px | H2 tablet |
| `text-5xl` | 48px | H2 desktop / hero secundario |

### Tracking & leading

- Headings grandes (`h2`+): `tracking-tight`
- Eyebrows / labels en mayúscula: `uppercase tracking-widest`
- Párrafos: `leading-relaxed` con `font-light`
- Default: el del navegador

### Patrones canónicos

```tsx
// Eyebrow / pill informativo
<span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground" />

// H2 hero
<h2 className="text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl" />

// Párrafo body
<p className="text-sm font-light leading-relaxed text-muted-foreground" />

// Título de tarjeta
<h3 className="text-sm font-semibold" />
```

---

## 3. Color

### Tokens base

Todos los colores se exponen como CSS custom properties sobre `:root` y se mapean al theme de Tailwind v4 vía `@theme inline`. **Nunca hardcodear hex en componentes** — usar siempre los tokens semánticos (`bg-background`, `text-foreground`, etc.).

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--background` | `#ffffff` | `#09090b` | Fondo de página |
| `--foreground` | `#09090b` | `#fafafa` | Texto principal, también botón primario |
| `--muted` | `#f4f4f5` | `#18181b` | Fondos sutiles (tarjetas, badges, barras) |
| `--muted-foreground` | `#71717a` | `#a1a1aa` | Texto secundario |
| `--border` | `#e4e4e7` | `#27272a` | Bordes en general (default global) |
| `--accent` | `#fafafa` | `#fafafa` | Fondo de elementos acentuados; en oscuro coincide con foreground |
| `--accent-foreground` | `#09090b` | `#09090b` | Texto sobre `--accent` |
| `--ring` | `#a1a1aa` | `#a1a1aa` | Anillo de focus |

> Nota sobre `accent`: en dark mode, `--accent` queda claro (`#fafafa`) y se invierte respecto al fondo. Un botón con `bg-accent text-accent-foreground` se ve **igual** en ambos temas (claro sobre oscuro). Útil para CTAs secundarios que deben llamar la atención sin importar el tema.

### Paleta semántica (Tailwind nativo)

Para señales de estado se usan los colores estándar de Tailwind con opacidad sobre fondo (`bg-{color}/10 text-{color}-500`). Mantenerlas así, **sin custom properties propias**, para que respondan automáticamente a futuras adaptaciones del theme.

| Estado | Fondo | Texto | Uso |
|--------|-------|-------|-----|
| **Éxito / Activo** | `bg-green-500/10` o `bg-emerald-500/10` | `text-green-500` / `text-emerald-500` | Proyecto activo, indicador "potenciado por IA", focus de cámara |
| **Atención / Borrador** | `bg-yellow-500/10` | `text-yellow-500` | Proyecto en estado DRAFT |
| **Advertencia** | `bg-amber-500/10` | `text-amber-500` | Almacenamiento >80%, deadlines cercanos |
| **Peligro / Bloqueado** | `bg-red-500/10` | `text-red-500` | Proyecto LOCKED, errores de formulario, almacenamiento >95% |
| **Neutro / Archivado** | `bg-gray-500/10` | `text-gray-500` | Proyecto ARCHIVED |

Patrón de uso (de `project-card.tsx`):

```tsx
const STATUS_COLORS = {
  DRAFT:    "bg-yellow-500/10 text-yellow-500",
  ACTIVE:   "bg-green-500/10 text-green-500",
  LOCKED:   "bg-red-500/10 text-red-500",
  ARCHIVED: "bg-gray-500/10 text-gray-500",
};
```

### Opacidades canónicas

El sistema usa el modificador `/N` de Tailwind para crear jerarquías sutiles sobre `foreground` / `border`. Las relaciones que aparecen repetidamente:

- `text-foreground/80` — texto principal sobre hero (más suave que `text-foreground` puro)
- `text-foreground/70` → `group-hover:text-foreground` — título de tarjeta en reposo / activo
- `text-foreground/50` — iconos decorativos (scroll hint)
- `border-foreground/20` → `hover:border-foreground/40` — botones outline sobre hero
- `bg-foreground/10` — backdrop de pill sobre imagen
- `bg-foreground/5` — fondo de icono dentro de tarjeta
- `border-border/60` → `hover:border-border` — tarjetas
- `bg-muted/20` → `hover:bg-muted/40` — fondo de tarjeta en grid

### Selección de texto

```css
::selection {
  background: var(--foreground);
  color: var(--background);
}
```

---

## 4. Espaciado y layout

Sin tokens custom: se usa la escala nativa de Tailwind (4px = 1).

### Contenedores

| Ancho máximo | Cuándo |
|--------------|--------|
| `max-w-md` | Texto auxiliar centrado en hero |
| `max-w-lg` | Subtítulo de sección |
| `max-w-5xl` | Sección de contenido marketing |
| `max-w-7xl` | **Layout principal del dashboard** y nav |

### Padding horizontal estándar

```tsx
className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
```

Marketing usa más padding lateral en breakpoints grandes:

```tsx
className="mx-auto max-w-5xl px-6 py-24 sm:px-10 sm:py-32"
```

### Grids canónicos

- **Landing features**: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- **Galería de fotos / staged previews**: `grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6`
- **Formularios de 2 columnas**: `grid gap-4 sm:grid-cols-2`

### Alturas fijas reutilizadas

- `h-16` — barra de navegación
- `h-12` — botón CTA principal del hero
- `h-11` — botón CTA secundario de sección
- `h-10` — caja de icono dentro de tarjeta
- `h-2` — barra de almacenamiento
- `h-1` — barra de progreso de upload

---

## 5. Bordes y radios

### Border-radius

| Token | Uso |
|-------|-----|
| `rounded-full` | Botones primarios CTA, pills, badges, avatares, indicadores circulares |
| `rounded-2xl` | **Tarjetas grandes** (features, paneles) |
| `rounded-xl` | Caja de icono dentro de tarjeta |
| `rounded-lg` | Inputs, botones de formulario, alertas, thumbnails de upload, drop zone |

> El `rounded-full` para CTAs pertenece al lenguaje del **landing/hero**. Dentro del dashboard, los botones primarios usan `rounded-lg` para no competir visualmente con la densidad de información.

### Border-width y color

- Default: `border` (1px) con color `var(--border)` aplicado a todos los elementos vía `* { border-color: var(--border) }` en `globals.css`.
- Drop zones: `border-2 border-dashed`.
- Detalles internos del viewfinder: `border-[1.5px]` para mantener un trazo fotográfico.

---

## 6. Sombras y profundidad

El sistema **rehúye** las sombras pesadas. Solo dos casos:

- `shadow-xl` — botón CTA principal del hero (cuando flota sobre la imagen animada).
- `drop-shadow-2xl` / `drop-shadow-md` — sobre el wordmark e imágenes en el hero, para asegurar legibilidad sobre el fondo dinámico.

Para profundidad dentro del producto se usan en cambio:

- Cambios de `bg-muted/20` → `bg-muted/40` en hover.
- Cambios de `border-border/60` → `border-border` en hover.
- Opacidad de texto (`/70` → `/100`).

---

## 7. Motion

Las únicas animaciones del sistema son **utilitarias** y existen para reforzar la metáfora fotográfica:

- **Cinematic Hero** (`framer-motion` en `cinematic-hero.tsx`): secuencia de enfoque-flash-disparo al cargar el landing. No replicar dentro del dashboard.
- **`animate-pulse`**: en el dot del eyebrow "Potenciado por IA" y en estados de carga ligeros.
- **`animate-bounce`**: indicador de scroll del hero.
- **`animate-spin`**: spinners de upload (`border-2 border-t-white`).
- **Transiciones**: por defecto `transition-colors` y `transition-opacity` con duración del navegador. Cuando se especifica, `duration-300 ease-out` o easing cinemático `[0.16, 1, 0.3, 1]` para cierres suaves.

Regla: si una animación dura más de 300ms y no es parte del hero, probablemente no debería existir.

---

## 8. Iconografía

- **Stroke icons inline**, sin librería de iconos. Cada `<svg>` se escribe directamente en el JSX usando viewBox `0 0 24 24`, `fill="none"`, `stroke="currentColor"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.
- **Stroke-width**: `1.5` para iconos decorativos dentro de tarjetas; `2` para iconos pequeños en botones (flechas →); `2.5` para checks/cancels en overlays.
- **Tamaños**: `14`, `20`, en CTAs y tarjetas respectivamente. Iconos circundantes en cajas `h-10 w-10 rounded-xl bg-foreground/5`.
- El color hereda de `currentColor`. Nunca aplicar `fill` directo.

Esta política mantiene el bundle pequeño y permite que cada icono herede tema light/dark sin fricción.

---

## 9. Componentes base

### 9.1 Botones

Tres variantes canónicas, definidas por el contraste necesario.

**Primario sólido (CTA fuerte)**

```tsx
<button className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90 shadow-xl">
```

Uso: hero, "Comenzar gratis". Se invierte automáticamente entre temas.

**Primario en formularios**

```tsx
<button className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50">
```

Uso: "Subir fotos", "Crear proyecto". Mismo color, distinto radio.

**Outline traslúcido (sobre imagen)**

```tsx
<a className="rounded-full border border-foreground/20 px-5 py-2 text-xs font-medium text-foreground/80 backdrop-blur-sm bg-foreground/10 transition-colors hover:border-foreground/40 hover:text-foreground">
```

Uso: nav del hero (Dashboard / Iniciar sesión).

**Estados deshabilitados**: siempre `disabled:opacity-50` y `pointer-events-none` cuando aplica.

### 9.2 Inputs

```tsx
const inputClass =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const labelClass = "mb-1 block text-sm font-medium";
```

Reglas:
- `bg-transparent` siempre — el fondo lo da el contenedor.
- Focus mediante `border-accent` + `ring-1 ring-accent`, nunca con outline del navegador.
- Label encima del input, no flotante.
- Hint/optional: `<span className="text-muted-foreground">(opcional)</span>` dentro del label.

### 9.3 Tarjeta (feature / panel)

```tsx
<div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
    <svg ... />
  </div>
  <h3 className="text-sm font-semibold">Título</h3>
  <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">…</p>
</div>
```

### 9.4 Tarjeta de proyecto (denso, dashboard)

```tsx
<Link className="group rounded-lg border border-border p-4 transition-colors hover:border-accent">
  <div className="flex items-center justify-between">
    <span className="rounded-full px-2 py-0.5 text-xs font-medium {STATUS_COLOR}" />
    <span className="text-xs text-muted-foreground">{TYPE}</span>
  </div>
  <h3 className="font-medium text-foreground/70 group-hover:text-foreground" />
  <p className="text-sm text-muted-foreground" />
</Link>
```

### 9.5 Pill / Badge

```tsx
// Eyebrow informativo
<span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
  Potenciado por IA
</span>

// Status badge (en tarjeta)
<span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-500" />
```

### 9.6 Alert / Mensaje inline

```tsx
// Error
<div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{message}</div>

// Advertencia con borde
<div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">{message}</div>
```

Regla: errores **simples** sin borde, advertencias con borde para diferenciarlas.

### 9.7 Barra de progreso

```tsx
<div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
  <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
</div>
```

Color del relleno por umbral (`storage-bar.tsx`):

- `0–80%` → `bg-foreground`
- `80–95%` → `bg-amber-500`
- `>95%` → `bg-red-500`

Para barras de progreso de upload (más finas): `h-1`.

### 9.8 Drop zone

```tsx
<button className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
  isDragging ? "border-foreground bg-foreground/5" : "border-border hover:border-accent"
} p-8`}>
```

### 9.9 Navegación

- **Marketing/hero**: nav transparente sobre fondo animado, botones outline traslúcidos.
- **Dashboard**: `border-b border-border bg-background`, altura `h-16`, `max-w-7xl`. Marca a la izquierda (`text-lg font-semibold`), links secundarios en `text-sm text-muted-foreground hover:text-foreground`, avatar+nombre+salir a la derecha.

---

## 10. Patrones de página

### Layout dashboard

```tsx
<div className="min-h-screen bg-background">
  <DashboardNav user={session.user} />
  <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    {children}
  </main>
</div>
```

### Sección de marketing

Cabecera: eyebrow + h2 + lead, todo centrado.
Contenido: grid de 1/2/3 columnas.
Cierre: lead + CTA.
`py-24 sm:py-32` entre secciones, `border-t border-border/50` para separar.

### Estados de imagen / fotografía

- Fotos siempre dentro de `aspect-square` u otra ratio fija + `overflow-hidden rounded-lg`.
- `object-cover` por defecto.
- Overlays sobre foto: `bg-black/40` (estado), `bg-red-900/40` (error). Iconos dentro: `text-white`.
- Botón flotante de eliminación: `right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100`.

---

## 11. Dark mode

- Activado por `@media (prefers-color-scheme: dark)` en `globals.css`. **No** hay `.dark` toggle manual; se respeta la preferencia del sistema.
- Algunas imágenes invierten su color en dark vía `dark:brightness-0 dark:invert` (logo monocromático) o `invert dark:invert-0` (wordmark).
- Spotlight del hero también cambia de tono según el tema (`rgba(0,0,0,0.04)` en claro, `rgba(255,255,255,0.06)` en oscuro).
- **Regla**: nunca usar `text-black` o `text-white` literales para UI. Usar `text-foreground` / `text-background`. Solo dentro de overlays opacos sobre fotos (donde el fondo siempre es oscuro) está permitido `text-white`.

---

## 12. Accesibilidad

- `lang="es"` en `<html>`.
- Anillo de focus visible (`--ring`) en inputs.
- `:focus-visible` heredado del navegador para botones nativos; outline custom solo cuando se reemplaza intencionalmente.
- Imágenes con `alt`. Decorativas: `aria-hidden`.
- Contraste mínimo: el sistema fuerza pares foreground/background invertidos, lo que asegura AAA en texto principal. **No bajar `text-muted-foreground` por debajo de las opacidades documentadas** sin verificar contraste contra `--background` en ambos temas.

---

## 13. Convenciones de implementación

- Path alias: `@/*` → `./src/*`.
- Estilos: solo Tailwind v4 (PostCSS) y los tokens de `globals.css`. **No** crear archivos CSS por componente.
- Variantes condicionales: literales template + ternarios. Si la lógica crece, extraer a un mapa `Record<string, string>` (ver `STATUS_COLORS` en `project-card.tsx`).
- Iconos: SVG inline, no librerías.
- Animación: preferir Tailwind utilities; usar `framer-motion` solo cuando la coreografía exija orquestación temporal (ej. hero).
- Texto de UI: español neutro, sentence case salvo en eyebrows (uppercase tracking-widest).

---

## 14. Anti-patrones

Cosas que rompen el sistema y no se deben hacer:

- ❌ Hardcodear hex (`#000`, `#fff`, `text-black`, `bg-white`) — usar tokens.
- ❌ Usar `font-bold` (700+) — el sistema termina en 600.
- ❌ Sombras genéricas (`shadow-md`, `shadow-lg`) en componentes de producto.
- ❌ Gradientes de color saturado.
- ❌ Iconos de Heroicons / Lucide importados como dependencia.
- ❌ Dark mode toggle manual — se respeta el sistema.
- ❌ Bordes gruesos (`border-2`) salvo en drop zones (dashed).
- ❌ Animaciones decorativas (parallax, hover transforms grandes) que distraigan de las fotos.
- ❌ Texto en inglés en la UI.
