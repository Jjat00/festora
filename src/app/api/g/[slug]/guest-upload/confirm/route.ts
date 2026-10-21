import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObjectSize, deleteObjects } from "@/lib/r2";
import { GUEST_MAX_FILES_PER_REQUEST, GUEST_MAX_FILE_SIZE, GUEST_NAME_MAX_LENGTH } from "@/lib/constants";
import { getGuestUploadProject, checkGuestStorage, checkGuestRate } from "@/lib/guest-upload";

type GuestUpload = {
  objectKey: string;
  thumbnailKey: string;
  originalFilename: string;
  width?: number;
  height?: number;
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Registra en la base las fotos que un invitado ya subió a R2. A diferencia de
 * confirmUpload (dueño autenticado), aquí no se confía en nada del navegador:
 * las claves deben ser de este proyecto y el tamaño se lee del bucket.
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
    uploaderName?: string;
    uploads?: GuestUpload[];
  } | null;
  const uploads = body?.uploads;
  if (!Array.isArray(uploads) || uploads.length === 0 || uploads.length > GUEST_MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: "Invalid uploads" }, { status: 400 });
  }

  const prefix = `${project.userId}/${project.id}`;
  const originalRe = new RegExp(`^${prefix}/originals/(${UUID})\\.(jpg|png|webp|heic|heif)$`);

  const valid: (GuestUpload & { size: number })[] = [];
  for (const u of uploads) {
    const match = typeof u?.objectKey === "string" ? u.objectKey.match(originalRe) : null;
    if (!match || u.thumbnailKey !== `${prefix}/thumbnails/${match[1]}.webp`) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    const size = await getObjectSize(u.objectKey);
    if (size === null) continue; // la subida a R2 falló: no hay nada que registrar
    if (size > GUEST_MAX_FILE_SIZE) {
      await deleteObjects([u.objectKey, u.thumbnailKey]);
      continue;
    }
    valid.push({ ...u, size });
  }
  if (valid.length === 0) return NextResponse.json({ error: "Nothing uploaded" }, { status: 400 });

  // Un confirm repetido (reintento del navegador) no debe duplicar fotos
  const existing = await prisma.photo.findMany({
    where: { projectId: project.id, objectKey: { in: valid.map((v) => v.objectKey) } },
    select: { objectKey: true },
  });
  const seen = new Set(existing.map((e) => e.objectKey));
  const fresh = valid.filter((v) => !seen.has(v.objectKey));
  if (fresh.length === 0) return NextResponse.json({ count: 0 });

  const rate = await checkGuestRate(project.id, fresh.length);
  if (rate) return NextResponse.json({ error: rate.error }, { status: rate.status });

  const storage = await checkGuestStorage(project, fresh.reduce((s, v) => s + v.size, 0));
  if (storage) {
    await deleteObjects(fresh.flatMap((v) => [v.objectKey, v.thumbnailKey]));
    return NextResponse.json({ error: storage.error }, { status: storage.status });
  }

  const uploaderName =
    typeof body?.uploaderName === "string"
      ? body.uploaderName.replace(/\s+/g, " ").trim().slice(0, GUEST_NAME_MAX_LENGTH) || null
      : null;

  const last = await prisma.photo.findFirst({
    where: { projectId: project.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const startOrder = (last?.order ?? -1) + 1;

  await prisma.photo.createMany({
    data: fresh.map((v, i) => ({
      projectId: project.id,
      objectKey: v.objectKey,
      thumbnailKey: v.thumbnailKey,
      originalFilename: String(v.originalFilename || "foto").slice(0, 200),
      order: startOrder + i,
      width: Number.isInteger(v.width) ? v.width : null,
      height: Number.isInteger(v.height) ? v.height : null,
      size: v.size,
      source: "GUEST" as const,
      uploaderName,
    })),
  });

  return NextResponse.json({ count: fresh.length }, { headers: { "Cache-Control": "no-store" } });
}
