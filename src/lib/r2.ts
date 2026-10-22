import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

// R2_ENDPOINT solo existe para desarrollo local contra un S3 de pruebas; en producción va vacío.
const R2_ENDPOINT = process.env.R2_ENDPOINT;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: Boolean(R2_ENDPOINT),
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function getPresignedUploadUrl(
  objectKey: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

export async function getSignedReadUrl(
  objectKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * PUT prefirmado que solo acepta exactamente `contentLength` bytes: el tamaño
 * entra en la firma, así que el navegador no puede subir más de lo reservado.
 */
export async function getPresignedSizedUploadUrl(
  objectKey: string,
  contentType: string,
  contentLength: number,
  expiresIn: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(r2Client, command, {
    expiresIn,
    signableHeaders: new Set(["content-length", "content-type"]),
  });
}

/** Tamaño y ETag del objeto, o null si no existe. */
export async function headObject(objectKey: string): Promise<{ size: number; etag: string } | null> {
  try {
    const head = await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey }));
    return head.ContentLength !== undefined && head.ETag ? { size: head.ContentLength, etag: head.ETag } : null;
  } catch {
    return null;
  }
}

/**
 * Descarga el objeto solo si sigue siendo la versión medida (mismo ETag): si
 * alguien lo reescribió entre la medición y la lectura, falla en vez de
 * devolver bytes distintos de los verificados.
 */
export async function getObjectIfMatch(objectKey: string, etag: string): Promise<Buffer | null> {
  try {
    const res = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey, IfMatch: etag }));
    return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
  } catch {
    return null;
  }
}

export async function putObject(objectKey: string, body: Buffer, contentType: string): Promise<void> {
  await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey, Body: body, ContentType: contentType }));
}

/** Tamaño real del objeto en el bucket, o null si no existe. */
export async function getObjectSize(objectKey: string): Promise<number | null> {
  try {
    const head = await r2Client.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey })
    );
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });
  await r2Client.send(command);
}

/**
 * Como deleteObjects, pero devuelve las claves que R2 no pudo borrar
 * (DeleteObjects responde 200 aunque algunos objetos fallen).
 */
export async function deleteObjectsReport(objectKeys: string[]): Promise<Set<string>> {
  const failed = new Set<string>();
  for (let i = 0; i < objectKeys.length; i += 1000) {
    const batch = objectKeys.slice(i, i + 1000);
    try {
      const res = await r2Client.send(
        new DeleteObjectsCommand({ Bucket: R2_BUCKET_NAME, Delete: { Objects: batch.map((Key) => ({ Key })) } })
      );
      for (const err of res.Errors ?? []) if (err.Key) failed.add(err.Key);
    } catch {
      batch.forEach((k) => failed.add(k));
    }
  }
  return failed;
}

export async function deleteObjects(objectKeys: string[]): Promise<void> {
  // DeleteObjects acepta como máximo 1000 claves por llamada
  for (let i = 0; i < objectKeys.length; i += 1000) {
    const command = new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: {
        Objects: objectKeys.slice(i, i + 1000).map((Key) => ({ Key })),
      },
    });
    await r2Client.send(command);
  }
}

export function getObjectKey(
  userId: string,
  projectId: string,
  photoId: string,
  ext: string
): string {
  return `${userId}/${projectId}/originals/${photoId}.${ext}`;
}

export function getGuestStagingKey(userId: string, projectId: string, uploadId: string, ext: string) {
  return `${userId}/${projectId}/guest-staging/${uploadId}.${ext}`;
}

export function getThumbnailKey(
  userId: string,
  projectId: string,
  photoId: string
): string {
  return `${userId}/${projectId}/thumbnails/${photoId}.webp`;
}
