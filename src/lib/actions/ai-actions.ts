"use server";

import { prisma } from "@/lib/prisma";
import { getSignedReadUrl } from "@/lib/r2";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getAnalysisModel, getActiveModelId } from "@/lib/ai/provider";
import { analyzePhotoBatch, type PhotoInput } from "@/lib/ai/analyze";
import type { PhotoAnalysis } from "@/lib/ai/schemas";

const VALID_CATEGORIES = new Set([
  "preparativos", "ceremonia", "retratos", "pareja", "grupo", "familia",
  "ninos", "mascotas", "recepcion", "fiesta", "comida", "decoracion",
  "detalles", "exterior", "arquitectura", "producto", "deportes", "otro",
]);

/** Normaliza variantes como "Retratos", "retrato", "La Ceremonia" → categoría canónica. */
function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase().trim()
    .replace(/^(la |el |los |las )/, "");

  // Si ya es válida tal cual, retornar
  if (VALID_CATEGORIES.has(lower)) return lower;

  // Mapeo de variantes comunes → categoría canónica
  const aliases: Record<string, string> = {
    // Singular → plural / canónico
    retrato: "retratos",
    preparativo: "preparativos",
    detalle: "detalles",
    mascota: "mascotas",
    // Acentos y variantes
    recepción: "recepcion",
    decoración: "decoracion",
    niños: "ninos",
    niño: "ninos",
    nina: "ninos",
    niña: "ninos",
    // Sinónimos → fiesta
    baile: "fiesta",
    "primer baile": "fiesta",
    brindis: "fiesta",
    vals: "fiesta",
    celebracion: "fiesta",
    celebración: "fiesta",
    // Sinónimos → exterior
    paisaje: "exterior",
    jardín: "exterior",
    jardin: "exterior",
    "al aire libre": "exterior",
    naturaleza: "exterior",
    parque: "exterior",
    playa: "exterior",
    campo: "exterior",
    // Sinónimos → grupo
    grupal: "grupo",
    amigos: "grupo",
    // Sinónimos → familia
    familiar: "familia",
    familias: "familia",
    familiares: "familia",
    // Sinónimos → pareja
    parejas: "pareja",
    novios: "pareja",
    enamorados: "pareja",
    romantico: "pareja",
    romántico: "pareja",
    // Sinónimos → mascotas
    perro: "mascotas",
    gato: "mascotas",
    animal: "mascotas",
    animales: "mascotas",
    // Sinónimos → comida
    alimentos: "comida",
    gastronomia: "comida",
    gastronomía: "comida",
    pastel: "comida",
    banquete: "comida",
    mesa: "comida",
    // Sinónimos → arquitectura
    edificio: "arquitectura",
    iglesia: "arquitectura",
    salon: "arquitectura",
    salón: "arquitectura",
    venue: "arquitectura",
    locacion: "arquitectura",
    locación: "arquitectura",
    // Sinónimos → producto
    productos: "producto",
    objeto: "producto",
    objetos: "producto",
    // Sinónimos → decoracion
    flores: "decoracion",
    arreglos: "decoracion",
    centros: "decoracion",
    // Sinónimos → detalles
    accesorios: "detalles",
    anillos: "detalles",
    zapatos: "detalles",
    ramo: "detalles",
    invitaciones: "detalles",
    // Sinónimos → deportes
    deporte: "deportes",
    atleta: "deportes",
    fitness: "deportes",
  };

  return aliases[lower] ?? "otro";
}

/**
 * Analiza fotos con el AI SDK (fire-and-forget).
 * Genera presigned URLs, llama al LLM en batches, y persiste los resultados.
 */
export async function dispatchPhotoAnalysis(
  photos: Array<{ id: string; objectKey: string; thumbnailKey: string | null }>
): Promise<void> {
  if (photos.length === 0) return;

  // Marcar como QUEUED
  await prisma.photo.updateMany({
    where: { id: { in: photos.map((p) => p.id) } },
    data: { aiStatus: "QUEUED" },
  });

  // Generar presigned URLs para thumbnails
  let photoInputs: PhotoInput[];
  try {
    photoInputs = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        thumbnailUrl: await getSignedReadUrl(p.thumbnailKey ?? p.objectKey),
      }))
    );
  } catch (err) {
    console.error("[ai] Error generating presigned URLs:", err);
    await markBatchFailed(photos.map((p) => p.id));
    return;
  }

  // Analizar batch a batch y persistir cada batch en la DB al terminar.
  // Así el progreso se ve gradualmente en el polling (cada 5 fotos).
  const BATCH_SIZE = 5;
  for (let i = 0; i < photoInputs.length; i += BATCH_SIZE) {
    const batchInputs = photoInputs.slice(i, i + BATCH_SIZE);
    const batchPhotos = photos.slice(i, i + BATCH_SIZE);

    let results: PhotoAnalysis[];
    let tokensUsed: number;
    try {
      const response = await analyzePhotoBatch(batchInputs);
      results = response.results;
      tokensUsed = response.tokensUsed;
    } catch (err) {
      console.error(`[ai] Batch ${i / BATCH_SIZE + 1} error:`, err);
      await markBatchFailed(batchPhotos.map((p) => p.id));
      continue;
    }

    console.log(`[ai] Batch ${i / BATCH_SIZE + 1}: ${results.length}/${batchPhotos.length} | ${tokensUsed} tokens`);

    const resultMap = new Map(results.map((r) => [r.photoId, r]));
    const now = new Date();

    // Persistir este batch inmediatamente — el polling lo ve de inmediato
    await Promise.all(
      batchPhotos.map(async (photo) => {
        const result = resultMap.get(photo.id);
        if (!result) {
          await prisma.photo.update({
            where: { id: photo.id },
            data: { aiStatus: "FAILED", aiProcessedAt: now },
          });
          return;
        }

        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            aiStatus: "DONE",
            aiProcessedAt: now,
            blurScore: result.blurScore,
            compositeScore: result.compositeScore,
            emotionLabel: result.emotion?.label ?? null,
            emotionValence: result.emotion?.valence ?? null,
            llmScore: result.overallScore,
            llmModel: getActiveModelId(),
            llmSummary: result.summary,
            llmDiscardReason: result.discardReason,
            llmBestInGroup: result.bestInGroup,
            llmComposition: result.composition,
            llmPoseQuality: result.poseQuality,
            llmBackgroundQuality: result.backgroundQuality,
            llmHighlights: result.highlights,
            llmIssues: result.issues,
            llmTokensUsed: tokensUsed,
            llmAnalyzedAt: now,
            llmCategory: normalizeCategory(result.category),
            llmTags: result.tags,
          },
        });
      })
    );
  }
}

async function markBatchFailed(photoIds: string[]): Promise<void> {
  await prisma.photo.updateMany({
    where: { id: { in: photoIds } },
    data: { aiStatus: "FAILED", aiProcessedAt: new Date() },
  });
}

// ------------------------------------------------------------------ //
// Fase 3 — Album suggestions
// ------------------------------------------------------------------ //

const CATEGORY_LABELS: Record<string, string> = {
  preparativos: "Preparativos",
  ceremonia: "Ceremonia",
  retratos: "Retratos",
  pareja: "Pareja",
  grupo: "Grupo",
  familia: "Familia",
  ninos: "Niños",
  mascotas: "Mascotas",
  recepcion: "Recepción",
  fiesta: "Fiesta",
  comida: "Comida",
  decoracion: "Decoración",
  detalles: "Detalles",
  exterior: "Exterior",
  arquitectura: "Arquitectura",
  producto: "Producto",
  deportes: "Deportes",
  otro: "Otros",
};

const albumNameSchema = z.object({
  category: z.string(),
  name: z.string().describe("Nombre descriptivo y bonito para el álbum en español"),
});

// Cuántas fotos entran en el álbum curado de una categoría
// Top 30% de las no descartadas, mínimo 5
function curatedCount(total: number) {
  // Top 30%, mínimo 5, nunca más de lo disponible
  return Math.min(total, Math.max(5, Math.ceil(total * 0.3)));
}

/**
 * Genera álbumes curados automáticamente:
 * - Un álbum por categoría con las mejores fotos (sin descartes, top 30% por score)
 * - Un álbum "_highlights" con las mejores fotos del proyecto completo
 *
 * Diferencia con las categorías (tabs): los álbumes son una selección curada,
 * no todas las fotos. El cliente ve menos fotos pero mejores.
 */
export async function generateAlbumSuggestions(
  projectId: string
): Promise<{ albums: number }> {
  // Fotos no descartadas con score, agrupadas por categoría
  const groups = await prisma.photo.groupBy({
    by: ["llmCategory"],
    where: { projectId, llmCategory: { not: null }, llmDiscardReason: null },
    _count: true,
    orderBy: { _count: { llmCategory: "desc" } },
  });

  if (groups.length === 0) return { albums: 0 };

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { name: true },
  });

  const categories = groups.map((g) => g.llmCategory!);

  // Total de fotos no descartadas para el álbum highlights
  const totalCurated = groups.reduce((sum, g) => sum + g._count, 0);
  const highlightsCount = Math.min(totalCurated, 30, Math.max(10, Math.ceil(totalCurated * 0.15)));

  // Generar nombres creativos para categorías + highlights
  const categoriesForPrompt = [...categories, "_highlights"];
  const { output } = await generateText({
    model: getAnalysisModel(),
    output: Output.array({ element: albumNameSchema }),
    prompt: `Genera nombres de álbum creativos y descriptivos en español para el proyecto "${project.name}".

Categorías (usa exactamente estos valores en "category"):
${categories.map((c) => `- ${c} (${CATEGORY_LABELS[c] ?? c})`).join("\n")}
- _highlights (Las mejores fotos del proyecto, selección cruzada)

El nombre debe ser evocador y bonito, no genérico. Ejemplos:
- ceremonia → "El Sí, Acepto"
- preparativos → "Antes del Gran Momento"
- fiesta → "¡A Celebrar!"
- retratos → "Momentos Especiales"
- exterior → "Bajo el Cielo Abierto"
- grupo → "Todos Juntos"
- _highlights → "Lo Mejor del Día" (o algo creativo similar)`,
    maxOutputTokens: 50 * categoriesForPrompt.length,
    temperature: 0.8,
  });

  // La mejor foto por categoría (cover) — solo entre no descartadas
  const coverPhotos = await prisma.photo.findMany({
    where: { projectId, llmCategory: { in: categories }, llmDiscardReason: null },
    orderBy: { compositeScore: "desc" },
    select: { id: true, llmCategory: true },
  });

  const coverByCategory = new Map<string, string>();
  for (const photo of coverPhotos) {
    if (photo.llmCategory && !coverByCategory.has(photo.llmCategory)) {
      coverByCategory.set(photo.llmCategory, photo.id);
    }
  }

  // La mejor foto del proyecto para el highlights (cover)
  const highlightsCover = await prisma.photo.findFirst({
    where: { projectId, llmDiscardReason: null, compositeScore: { not: null } },
    orderBy: { compositeScore: "desc" },
    select: { id: true },
  });

  const nameMap = new Map((output ?? []).map((a) => [a.category, a.name]));

  await prisma.albumSuggestion.deleteMany({ where: { projectId } });

  await prisma.albumSuggestion.createMany({
    data: [
      // Álbum highlights primero
      {
        projectId,
        category: "_highlights",
        name: nameMap.get("_highlights") ?? "Lo Mejor del Día",
        coverPhotoId: highlightsCover?.id ?? null,
        photoCount: highlightsCount,
      },
      // Álbumes por categoría — photoCount refleja las fotos curadas (top 30%)
      ...groups.map((g) => ({
        projectId,
        category: g.llmCategory!,
        name: nameMap.get(g.llmCategory!) ?? CATEGORY_LABELS[g.llmCategory!] ?? g.llmCategory!,
        coverPhotoId: coverByCategory.get(g.llmCategory!) ?? null,
        photoCount: curatedCount(g._count),
      })),
    ],
  });

  return { albums: groups.length + 1 };
}

/* ─── Fase: Generación de frase de portada ─────────────────────────── */

const PROJECT_TYPE_CONTEXT: Record<string, string> = {
  WEDDING: "una boda — amor, unión, promesas eternas",
  QUINCEANERA: "unos XV años — juventud, ilusión, nuevo comienzo",
  GRADUATION: "una graduación — logro, esfuerzo, orgullo familiar",
  PORTRAIT: "una sesión de retrato — identidad, esencia, belleza personal",
  CASUAL: "una sesión casual — espontaneidad, alegría, momentos reales",
  CORPORATE: "un evento corporativo — profesionalismo, éxito, visión",
  PRODUCT: "fotografía de producto — calidad, detalle, valor",
  OTHER: "un evento especial — emociones, recuerdos, momentos únicos",
};

/**
 * Genera una frase poética para la portada de la galería.
 * Usa el tipo de proyecto y una frase base opcional como contexto.
 */
export async function generateCoverPhrase(
  projectType: string,
  basePhrase?: string,
): Promise<string> {
  const context = PROJECT_TYPE_CONTEXT[projectType] ?? PROJECT_TYPE_CONTEXT.OTHER;

  const prompt = basePhrase
    ? `El fotógrafo quiere transmitir esta idea: "${basePhrase}". Parafraséala de forma poética y emotiva, adaptada al contexto de ${context}.`
    : `Genera una frase original y emotiva para la portada de una galería fotográfica de ${context}.`;

  const { text } = await generateText({
    model: getAnalysisModel(),
    system: `Eres un escritor poético especializado en frases cortas para galerías fotográficas.
Tu objetivo es generar UNA SOLA frase que inspire motivación, orgullo y una pizca de melancolía en el cliente al ver sus fotos.

Reglas:
- Máximo 15 palabras
- En español
- Sin comillas, sin puntos suspensivos al inicio
- Tono: elegante, emotivo, nostálgico pero esperanzador
- No uses clichés como "recuerdos que duran para siempre"
- La frase debe funcionar sola, sin contexto adicional`,
    prompt,
    maxOutputTokens: 100,
    temperature: 0.9,
  });

  return text.trim().replace(/^[""]|[""]$/g, "");
}
