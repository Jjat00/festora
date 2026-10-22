import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteObjectsReport, getObjectIfMatch, headObject, putObject } from "@/lib/r2";
import { GUEST_CONFIRM_BATCH, GUEST_NAME_MAX_LENGTH } from "@/lib/constants";
import { getGuestUploadProject, lockOwner, ownerUsage, processGuestImage, projectUsage } from "@/lib/guest-upload";
import { safeFilename } from "@/lib/safe-filename";

// Decodificar y generar miniaturas de un lote toma algunos segundos
export const maxDuration = 60;

type Item = { id: string; originalFilename?: unknown };

class QuotaExceeded extends Error {}
class ClaimLost extends Error {}

/**
 * Convierte reservas de invitados en fotos. Cada reserva se reclama en
 * exclusiva (PENDING -> PROCESSING) antes de tocar un solo archivo; se lee la
 * versión medida de staging, se decodifica, se genera la miniatura y se publican
 * esos mismos bytes. Repetir la llamada con una reserva ya confirmada la
 * devuelve como confirmada, sin crear otra foto.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await getGuestUploadProject(slug);
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { project } = gate;

  const body = (await req.json().catch(() => null)) as { uploaderName?: unknown; items?: unknown } | null;
  const rawItems = body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > GUEST_CONFIRM_BATCH) {
    return NextResponse.json({ error: "Invalid items" }, { status: 400 });
  }
  const items = new Map<string, Item>();
  for (const it of rawItems) {
    if (it && typeof it === "object" && typeof (it as Item).id === "string" && !items.has((it as Item).id)) {
      items.set((it as Item).id, it as Item);
    }
  }
  const ids = [...items.keys()];


  /**
   * Estado final de cada id pedido, leído al terminar (no instantáneas previas):
   * los estados solo avanzan, así que una reserva que otra petición confirmó o
   * está procesando aparece como tal. Lo demás es rechazo terminal.
   */
  async function classify() {
    const rows = await prisma.guestUpload.findMany({
      where: { id: { in: ids }, projectId: project.id },
      select: { id: true, status: true },
    });
    const by = new Map(rows.map((r) => [r.id, r.status]));
    return {
      confirmed: ids.filter((id) => by.get(id) === "CONFIRMED"),
      processing: ids.filter((id) => by.get(id) === "PROCESSING"),
      rejected: ids.filter((id) => !["CONFIRMED", "PROCESSING"].includes(by.get(id) ?? "")),
    };
  }

  // Reclamo exclusivo: otra petición con el mismo id ya no lo puede procesar
  const claimed = await prisma.guestUpload.updateManyAndReturn({
    where: { id: { in: ids }, projectId: project.id, status: "PENDING", expiresAt: { gt: new Date() } },
    data: { status: "PROCESSING", processingAt: new Date() },
  });

  const uploaderName =
    typeof body?.uploaderName === "string"
      ? body.uploaderName.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, GUEST_NAME_MAX_LENGTH) || null
      : null;

  type Ready = (typeof claimed)[number] & { thumbnailSize: number; width: number; height: number };
  const ready: Ready[] = [];
  const rejected: string[] = [];

  /**
   * Retira los archivos finales de reservas que no se registrarán. Solo las que
   * R2 confirmó borradas pasan a REJECTED (y dejan de cobrar su copia final);
   * las demás siguen en PROCESSING, cobrando, hasta que el barrido las tome al
   * agotarse su plazo de proceso.
   */
  async function abandon(rows: { id: string; finalKey: string; finalThumbnailKey: string }[]) {
    if (rows.length === 0) return;
    const failed = await deleteObjectsReport(rows.flatMap((r) => [r.finalKey, r.finalThumbnailKey]));
    const gone = rows.filter((r) => !failed.has(r.finalKey) && !failed.has(r.finalThumbnailKey)).map((r) => r.id);
    if (gone.length > 0) {
      await prisma.guestUpload.updateMany({ where: { id: { in: gone }, status: "PROCESSING" }, data: { status: "REJECTED" } });
    }
  }

  for (const r of claimed) {
    try {
      const head = await headObject(r.stagingKey);
      if (!head || head.size !== r.size) throw new Error("size");
      const bytes = await getObjectIfMatch(r.stagingKey, head.etag);
      if (!bytes || bytes.length !== r.size) throw new Error("changed");
      const img = await processGuestImage(bytes, r.contentType);
      // allSettled: si una escritura falla, esperar a la otra antes de limpiar
      const writes = await Promise.allSettled([
        putObject(r.finalKey, bytes, r.contentType),
        putObject(r.finalThumbnailKey, img.thumbnail, "image/webp"),
      ]);
      if (writes.some((w) => w.status === "rejected")) throw new Error("publish");
      ready.push({ ...r, thumbnailSize: img.thumbnail.length, width: img.width, height: img.height });
    } catch {
      rejected.push(r.id);
    }
  }
  await abandon(claimed.filter((c) => rejected.includes(c.id)));

  if (ready.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        await lockOwner(tx, project.userId);
        const readyIds = ready.map((r) => r.id);
        // Finalizar exige seguir dueño del reclamo: si el barrido dio la reserva
        // por abandonada (REJECTED), aquí no se registra nada
        const finalized = await tx.guestUpload.updateMany({
          where: { id: { in: readyIds }, status: "PROCESSING" },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });
        if (finalized.count !== readyIds.length) throw new ClaimLost();
        const adding = ready.reduce((s, r) => s + r.size + r.thumbnailSize, 0);
        if ((await ownerUsage(tx, project.userId, readyIds)) + adding > project.userStorageLimit) throw new QuotaExceeded();
        if (project.storageLimit !== null && (await projectUsage(tx, project.id, readyIds)) + adding > project.storageLimit) {
          throw new QuotaExceeded();
        }

        const last = await tx.photo.findFirst({
          where: { projectId: project.id },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        const startOrder = (last?.order ?? -1) + 1;
        await tx.photo.createMany({
          data: ready.map((r, i) => ({
            projectId: project.id,
            objectKey: r.finalKey,
            thumbnailKey: r.finalThumbnailKey,
            originalFilename: safeFilename(String(items.get(r.id)?.originalFilename ?? ""), `foto.${r.finalKey.split(".").pop()}`),
            order: startOrder + i,
            width: r.width,
            height: r.height,
            size: r.size,
            thumbnailSize: r.thumbnailSize,
            source: "GUEST" as const,
            uploaderName,
          })),
        });
        return readyIds;
      });
    } catch (e) {
      // La transacción se revirtió: estas copias finales no las registró nadie
      // (el reclamo era exclusivo), así que se pueden retirar.
      if (!(e instanceof QuotaExceeded) && !(e instanceof ClaimLost)) console.error("[guest-upload] confirm:", e);
      await abandon(ready);
      const status = await classify();
      return NextResponse.json(
        { error: e instanceof QuotaExceeded ? "STORAGE_LIMIT_EXCEEDED" : "CONFIRM_FAILED", ...status },
        { status: e instanceof QuotaExceeded ? 403 : 500 }
      );
    }
  }

  // Staging ya no hace falta; si falla, el barrido lo vuelve a intentar. No debe
  // convertir un registro exitoso en un error para el invitado.
  // (Las rechazadas siguen cobrando su staging hasta que el barrido lo limpie tras vencer la firma.)
  await deleteObjectsReport(claimed.map((r) => r.stagingKey)).catch(() => null);

  return NextResponse.json(await classify(), { headers: { "Cache-Control": "no-store" } });
}
