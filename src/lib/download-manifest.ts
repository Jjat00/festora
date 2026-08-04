import { getSignedReadUrl } from "@/lib/r2";

/**
 * Vigencia de las URLs prefirmadas del manifiesto. Un proyecto de varios GB
 * puede tardar horas en una conexión lenta y el ZIP se arma en el navegador,
 * así que las URLs tienen que sobrevivir a toda la descarga.
 */
const MANIFEST_URL_TTL_SECONDS = 6 * 60 * 60;

export type ManifestFile = {
  id: string;
  /** Nombre dentro del ZIP, ya deduplicado. */
  name: string;
  size: number;
  /** URL prefirmada de R2: el navegador lee el original sin pasar por el servidor. */
  url: string;
};

export type DownloadManifest = {
  zipName: string;
  totalSize: number;
  files: ManifestFile[];
};

type PhotoRow = {
  id: string;
  objectKey: string;
  originalFilename: string;
  size: number;
};

export function safeProjectName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "festora";
}

/**
 * Convierte las fotos en un manifiesto que el cliente puede consumir para
 * armar el ZIP por su cuenta. Los nombres se deduplican aquí porque en el ZIP
 * dos entradas con el mismo nombre son un archivo corrupto.
 */
export async function buildDownloadManifest(
  photos: PhotoRow[],
  zipName: string
): Promise<DownloadManifest> {
  const usedNames = new Map<string, number>();
  function uniqueName(name: string): string {
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    if (dot === -1) return `${name} (${count})`;
    return `${name.slice(0, dot)} (${count})${name.slice(dot)}`;
  }

  const files = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      name: uniqueName(photo.originalFilename),
      size: photo.size,
      url: await getSignedReadUrl(photo.objectKey, MANIFEST_URL_TTL_SECONDS),
    }))
  );

  return {
    zipName,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    files,
  };
}
