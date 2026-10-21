import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  copyObject,
  deleteObjects,
  getGuestStagingKeys,
  getObjectKey,
  getObjectSize,
  getThumbnailKey,
  readObjectPrefix,
} from "@/lib/r2";
import { GUEST_MAX_FILES_PER_REQUEST, GUEST_NAME_MAX_LENGTH } from "@/lib/constants";
import {
  cleanDimension,
  getGuestUploadProject,
  lockOwner,
  matchesImageType,
  ownerUsage,
  projectUsage,
} from "@/lib/guest-upload";
import { safeFilename } from "@/lib/safe-filename";

type Item = { id: string; originalFilename?: unknown; width?: unknown; height?: unknown };

class QuotaExceeded extends Error {}

/**
 * Registra fotos de invitados a partir de sus reservas. Solo se aceptan IDs de
 * reserva de este proyecto, vigentes y sin confirmar; el tamaño y el formato se
 * comprueban en el bucket; y lo único que se borra es staging de esa reserva.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await getGuestUploadProject(slug);
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { project } = gate;

  const body = (await req.json().catch(() => null)) as { uploaderName?: unknown; items?: unknown } | null;
  const rawItems = body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > GUEST_MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: "Invalid items" }, { status: 400 });
  }
  const items = new Map<string, Item>();
  for (const it of rawItems) {
    if (it && typeof it === "object" && typeof (it as Item).id === "string" && !items.has((it as Item).id)) {
      items.set((it as Item).id, it as Item);
    }
  }

  const reservations = await prisma.guestUpload.findMany({
    where: {
      id: { in: [...items.keys()] },
      projectId: project.id,
      confirmedAt: null,
      stagingCleared: false,
      expiresAt: { gt: new Date() },
    },
  });

  // Verificación en el bucket: tamaño exacto al reservado y formato real
  const verified: typeof reservations = [];
  const rejected: string[] = [];
  await Promise.all(
    reservations.map(async (r) => {
      const keys = getGuestStagingKeys(project.userId, project.id, r.id, r.extension);
      const [size, thumbSize, head, thumbHead] = await Promise.all([
        getObjectSize(keys.original),
        getObjectSize(keys.thumbnail),
        readObjectPrefix(keys.original, 16),
        readObjectPrefix(keys.thumbnail, 16),
      ]);
      const ok =
        size === r.size &&
        thumbSize !== null && thumbSize > 0 && thumbSize <= r.thumbnailSize &&
        matchesImageType(head, r.contentType) &&
        matchesImageType(thumbHead, "image/webp");
      if (ok) verified.push(r);
      else rejected.push(r.id);
    })
  );

  if (rejected.length > 0) {
    const bad = reservations.filter((r) => rejected.includes(r.id));
    await deleteObjects(bad.flatMap((r) => {
      const k = getGuestStagingKeys(project.userId, project.id, r.id, r.extension);
      return [k.original, k.thumbnail];
    }));
    await prisma.guestUpload.updateMany({ where: { id: { in: rejected } }, data: { stagingCleared: true } });
  }
  if (verified.length === 0) return NextResponse.json({ error: "Nothing uploaded" }, { status: 400 });

  // Copia a la ubicación definitiva: la URL de subida apunta a staging, así que
  // un PUT repetido ya no puede alterar la foto registrada.
  const finalKeys = new Map(
    verified.map((r) => [
      r.id,
      { original: getObjectKey(project.userId, project.id, r.id, r.extension), thumbnail: getThumbnailKey(project.userId, project.id, r.id) },
    ])
  );
  await Promise.all(
    verified.map(async (r) => {
      const s = getGuestStagingKeys(project.userId, project.id, r.id, r.extension);
      const f = finalKeys.get(r.id)!;
      await Promise.all([copyObject(s.original, f.original), copyObject(s.thumbnail, f.thumbnail)]);
    })
  );

  const uploaderName =
    typeof body?.uploaderName === "string"
      ? body.uploaderName.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, GUEST_NAME_MAX_LENGTH) || null
      : null;

  let claimedIds: string[] = [];
  try {
    claimedIds = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, project.userId);

      // Reclamo atómico: si otra petición ya confirmó una reserva, aquí no vuelve
      const claimed = await tx.guestUpload.updateManyAndReturn({
        where: { id: { in: verified.map((r) => r.id) }, confirmedAt: null, stagingCleared: false },
        data: { confirmedAt: new Date() },
        select: { id: true, size: true },
      });
      if (claimed.length === 0) return [];

      // Las reservas ya contaban como pendientes; confirmadas pasan a contar como fotos
      const adding = claimed.reduce((s, c) => s + c.size, 0);
      if ((await ownerUsage(tx, project.userId)) + adding > project.userStorageLimit) throw new QuotaExceeded();
      if (project.storageLimit !== null && (await projectUsage(tx, project.id)) + adding > project.storageLimit) {
        throw new QuotaExceeded();
      }

      const last = await tx.photo.findFirst({
        where: { projectId: project.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const startOrder = (last?.order ?? -1) + 1;

      const byId = new Map(verified.map((r) => [r.id, r]));
      await tx.photo.createMany({
        data: claimed.map((c, i) => {
          const r = byId.get(c.id)!;
          const it = items.get(c.id)!;
          const keys = finalKeys.get(c.id)!;
          return {
            projectId: project.id,
            objectKey: keys.original,
            thumbnailKey: keys.thumbnail,
            originalFilename: safeFilename(String(it.originalFilename ?? ""), `foto.${r.extension}`),
            order: startOrder + i,
            width: cleanDimension(it.width),
            height: cleanDimension(it.height),
            size: r.size,
            source: "GUEST" as const,
            uploaderName,
          };
        }),
      });
      return claimed.map((c) => c.id);
    });
  } catch (e) {
    if (e instanceof QuotaExceeded) {
      // La transacción se revirtió. Solo se borran las copias que nadie registró:
      // una petición simultánea pudo confirmar alguna de estas mismas reservas.
      const taken = await prisma.guestUpload.findMany({
        where: { id: { in: verified.map((r) => r.id) }, confirmedAt: { not: null } },
        select: { id: true },
      });
      const takenIds = new Set(taken.map((t) => t.id));
      await deleteObjects(
        verified
          .filter((r) => !takenIds.has(r.id))
          .flatMap((r) => [finalKeys.get(r.id)!.original, finalKeys.get(r.id)!.thumbnail])
      );
      return NextResponse.json({ error: "STORAGE_LIMIT_EXCEEDED" }, { status: 403 });
    }
    throw e;
  }

  // Staging ya no hace falta; el barrido de vencidas lo vuelve a borrar por si
  // alguien reutiliza la URL antes de que venza.
  if (claimedIds.length > 0) {
    await deleteObjects(
      verified
        .filter((r) => claimedIds.includes(r.id))
        .flatMap((r) => {
          const k = getGuestStagingKeys(project.userId, project.id, r.id, r.extension);
          return [k.original, k.thumbnail];
        })
    );
  }

  return NextResponse.json(
    { count: claimedIds.length, confirmed: claimedIds, rejected },
    { headers: { "Cache-Control": "no-store" } }
  );
}
