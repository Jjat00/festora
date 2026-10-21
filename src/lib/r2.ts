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

export async function deleteObjects(objectKeys: string[]): Promise<void> {
  if (objectKeys.length === 0) return;
  const command = new DeleteObjectsCommand({
    Bucket: R2_BUCKET_NAME,
    Delete: {
      Objects: objectKeys.map((Key) => ({ Key })),
    },
  });
  await r2Client.send(command);
}

export function getObjectKey(
  userId: string,
  projectId: string,
  photoId: string,
  ext: string
): string {
  return `${userId}/${projectId}/originals/${photoId}.${ext}`;
}

export function getThumbnailKey(
  userId: string,
  projectId: string,
  photoId: string
): string {
  return `${userId}/${projectId}/thumbnails/${photoId}.webp`;
}
