import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, getObjectKey, getThumbnailKey } from "@/lib/r2";
import {
  ALLOWED_IMAGE_TYPES,
  GUEST_MAX_FILE_SIZE,
  GUEST_MAX_FILES_PER_REQUEST,
} from "@/lib/constants";
import { getGuestUploadProject, checkGuestStorage, checkGuestRate } from "@/lib/guest-upload";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/**
 * Versión pública de /api/upload/presign para el álbum colaborativo. Las claves
 * van bajo el prefijo del dueño del proyecto, igual que sus propias fotos.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const result = await getGuestUploadProject(slug);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { project } = result;

  const body = (await req.json().catch(() => null)) as {
    files?: { contentType: string; size: number }[];
  } | null;
  const files = body?.files;
  if (!Array.isArray(files) || files.length === 0 || files.length > GUEST_MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: "Invalid files" }, { status: 400 });
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.contentType)) {
      return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
    }
    if (typeof file.size !== "number" || file.size <= 0 || file.size > GUEST_MAX_FILE_SIZE) {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
    }
  }

  const rate = await checkGuestRate(project.id, files.length);
  if (rate) return NextResponse.json({ error: rate.error }, { status: rate.status });

  const storage = await checkGuestStorage(project, files.reduce((s, f) => s + f.size, 0));
  if (storage) return NextResponse.json({ error: storage.error }, { status: storage.status });

  const presignedUrls = await Promise.all(
    files.map(async (file) => {
      const photoId = crypto.randomUUID();
      const objectKey = getObjectKey(project.userId, project.id, photoId, EXTENSIONS[file.contentType]);
      const thumbnailKey = getThumbnailKey(project.userId, project.id, photoId);
      const [uploadUrl, thumbnailUploadUrl] = await Promise.all([
        getPresignedUploadUrl(objectKey, file.contentType),
        getPresignedUploadUrl(thumbnailKey, "image/webp"),
      ]);
      return { objectKey, thumbnailKey, uploadUrl, thumbnailUploadUrl };
    })
  );

  return NextResponse.json({ presignedUrls }, { headers: { "Cache-Control": "no-store" } });
}
