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
