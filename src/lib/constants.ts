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
export const GUEST_MAX_THUMBNAIL_SIZE = 1.5 * 1024 * 1024;
export const GUEST_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]; // HEIC se convierte en el navegador
export const GUEST_RESERVATION_TTL_SECONDS = 15 * 60;
export const GUEST_MAX_PENDING_PER_PROJECT = 200;
export const GUEST_MAX_PROJECT_STORAGE_GB = 1024;
