import { openai } from "@ai-sdk/openai";

/**
 * Modelo por defecto para análisis de fotos.
 * gpt-4o-mini: barato ($0.15/1M input), rápido, buena visión.
 */
export function getAnalysisModel() {
  return openai("gpt-4o-mini");
}
