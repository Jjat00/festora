export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
export const MAX_CONCURRENT_UPLOADS = 6;
export const THUMBNAIL_MAX_WIDTH = 800;
export const PIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
export const SLUG_LENGTH = 8;
// Ojo: este numero se anuncia en el sitio publico (diccionarios de i18n,
// /llms.txt y /pricing.md). Si cambia, hay que cambiarlo tambien alli.
export const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB in bytes

// Álbum colaborativo (subidas de invitados desde la galería pública)
export const GUEST_MAX_FILES_PER_REQUEST = 20;
export const GUEST_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB: el navegador ya comprime antes de subir
export const GUEST_HOURLY_LIMIT = 400; // fotos de invitados por proyecto y por hora
export const GUEST_NAME_MAX_LENGTH = 60;
// Lo que se aparta por foto pendiente para la miniatura que generará el servidor
export const GUEST_THUMBNAIL_RESERVE = 512 * 1024;
export const GUEST_MAX_PIXELS = 40_000_000; // límite de decodificación en el servidor
export const GUEST_CONFIRM_BATCH = 5;
export const GUEST_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]; // HEIC se convierte en el navegador
export const GUEST_RESERVATION_TTL_SECONDS = 15 * 60;
// La reserva vence un poco después que la firma, para que el barrido nunca
// limpie mientras la URL de subida todavía funciona
export const GUEST_RESERVATION_MARGIN_SECONDS = 120;
export const GUEST_MAX_PENDING_PER_PROJECT = 200;
export const GUEST_MAX_PROJECT_STORAGE_GB = 1024;
export const GUEST_MIN_PROJECT_STORAGE_GB = 0.1;
