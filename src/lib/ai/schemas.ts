import { z } from "zod";

export const emotionSchema = z
  .object({
    label: z.string().describe("Emoción dominante: feliz, neutral, conmovido, nostálgico, etc."),
    valence: z
      .number()
      .min(-1)
      .max(1)
      .describe("-1=muy negativa, 0=neutral, 1=muy positiva"),
  })
  .nullable()
  .describe("null si no hay personas visibles en la foto");

export const photoAnalysisSchema = z.object({
  photoId: z.string().describe("El ID exacto de la foto proporcionado"),
  overallScore: z
    .number()
    .min(1)
    .max(10)
    .describe("Calidad general para entrega al cliente. 1=descartable, 10=perfecta"),
  blurScore: z
    .number()
    .min(0)
    .max(10)
    .describe("Nitidez. 0=muy borrosa, 10=nítida. Bokeh intencional=7+"),
  compositeScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Score compuesto 0-100 combinando todos los factores de calidad"),
  emotion: emotionSchema,
  composition: z.string().describe("Tipo de composición: regla de tercios, centrada, etc."),
  poseQuality: z
    .string()
    .nullable()
    .describe("Calidad de la pose. null si no hay personas"),
  backgroundQuality: z.string().describe("Calidad del fondo: limpio, bokeh suave, desordenado"),
  discardReason: z
    .string()
    .nullable()
    .describe("Razón para descartar la foto. null si es buena"),
  bestInGroup: z.boolean().describe("¿Sería la mejor foto de una serie similar?"),
  highlights: z.array(z.string()).describe("Puntos fuertes: iluminación, sonrisa, composición..."),
  issues: z.array(z.string()).describe("Problemas: ojos cerrados, desenfoque, fondo sucio..."),
  summary: z.string().describe("Una frase corta describiendo la foto en español"),
  category: z
    .string()
    .describe("Categoría del momento: ceremonia, recepción, retratos, detalles, preparativos, fiesta, etc."),
  tags: z
    .array(z.string())
    .describe("Tags descriptivos: novia, novio, grupo, primer-baile, ramo, anillos, etc."),
});

export type PhotoAnalysis = z.infer<typeof photoAnalysisSchema>;
