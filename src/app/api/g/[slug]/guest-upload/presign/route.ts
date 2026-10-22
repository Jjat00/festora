import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStagingKey, getObjectKey, getPresignedSizedUploadUrl, getThumbnailKey } from "@/lib/r2";
import {
  GUEST_ALLOWED_TYPES,
  GUEST_HOURLY_LIMIT,
  GUEST_MAX_FILE_SIZE,
  GUEST_MAX_FILES_PER_REQUEST,
  GUEST_MAX_PENDING_PER_PROJECT,
  GUEST_RESERVATION_MARGIN_SECONDS,
  GUEST_RESERVATION_TTL_SECONDS,
} from "@/lib/constants";
import {
  cleanupExpiredGuestUploads,
  getGuestUploadProject,
  lockOwner,
  ownerUsage,
  projectUsage,
  reservationCost,
  type Failure,
} from "@/lib/guest-upload";

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type FileRequest = { contentType: string; size: number };

function isFileRequest(f: unknown): f is FileRequest {
  if (!f || typeof f !== "object") return false;
  const { contentType, size } = f as Record<string, unknown>;
  return (
    typeof contentType === "string" &&
    GUEST_ALLOWED_TYPES.includes(contentType) &&
    Number.isInteger(size) && (size as number) > 0 && (size as number) <= GUEST_MAX_FILE_SIZE
  );
}

/**
 * Reserva espacio para las fotos de un invitado y devuelve un PUT firmado por
 * el tamaño exacto hacia guest-staging/. Nada llega a originals/ sin pasar por confirm.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await getGuestUploadProject(slug);
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { project } = gate;

  const body = (await req.json().catch(() => null)) as { files?: unknown } | null;
  const files = body?.files;
  if (!Array.isArray(files) || files.length === 0 || files.length > GUEST_MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: "Invalid files" }, { status: 400 });
  }
  if (!files.every(isFileRequest)) return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });

  await cleanupExpiredGuestUploads({ ownerId: project.userId }, 3_000);

  // Mientras la URL siga viva pueden coexistir staging y la copia final
  const requested = files.reduce((s, f) => s + reservationCost(f.size), 0);

  const result = await prisma.$transaction(async (tx): Promise<Failure | { ids: string[] }> => {
    await lockOwner(tx, project.userId);

    const [lastHour, pending] = await Promise.all([
      tx.guestUpload.count({
        where: { projectId: project.id, createdAt: { gt: new Date(Date.now() - 3600_000) } },
      }),
      tx.guestUpload.count({ where: { projectId: project.id, stagingCleared: false, status: { not: "CONFIRMED" } } }),
    ]);
    if (lastHour + files.length > GUEST_HOURLY_LIMIT || pending + files.length > GUEST_MAX_PENDING_PER_PROJECT) {
      return { error: "RATE_LIMITED", status: 429 };
    }

    if ((await ownerUsage(tx, project.userId)) + requested > project.userStorageLimit) {
      return { error: "STORAGE_LIMIT_EXCEEDED", status: 403 };
    }
    if (project.storageLimit !== null && (await projectUsage(tx, project.id)) + requested > project.storageLimit) {
      return { error: "STORAGE_LIMIT_EXCEEDED", status: 403 };
    }

    // Se fija después del lock: la firma (TTL) se emite enseguida y vence antes que la reserva
    const expiresAt = new Date(Date.now() + (GUEST_RESERVATION_TTL_SECONDS + GUEST_RESERVATION_MARGIN_SECONDS) * 1000);
    const rows = files.map((f) => {
      const id = crypto.randomUUID();
      const ext = EXTENSIONS[f.contentType];
      return {
        id,
        projectId: project.id,
        ownerId: project.userId,
        stagingKey: getGuestStagingKey(project.userId, project.id, id, ext),
        finalKey: getObjectKey(project.userId, project.id, id, ext),
        finalThumbnailKey: getThumbnailKey(project.userId, project.id, id),
        contentType: f.contentType,
        size: f.size,
        expiresAt,
      };
    });
    await tx.guestUpload.createMany({ data: rows });
    return { ids: rows.map((r) => r.id) };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const uploads = await Promise.all(
    result.ids.map(async (id, i) => {
      const f = files[i];
      const key = getGuestStagingKey(project.userId, project.id, id, EXTENSIONS[f.contentType]);
      return { id, uploadUrl: await getPresignedSizedUploadUrl(key, f.contentType, f.size, GUEST_RESERVATION_TTL_SECONDS) };
    })
  );

  return NextResponse.json({ uploads }, { headers: { "Cache-Control": "no-store" } });
}
