import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Modelos disponibles para la app.
 * Agregar nuevos modelos aquí y actualizar AI_MODELS.
 */
export const AI_MODELS = {
  "gpt-4o-mini": () => openai("gpt-4o-mini"),
  "gpt-4o": () => openai("gpt-4o"),
  "gemini-2.0-flash": () => google("gemini-2.0-flash"),
  "gemini-2.0-flash-lite": () => google("gemini-2.0-flash-lite"),
} as const;

export type AIModelId = keyof typeof AI_MODELS;

const DEFAULT_MODEL: AIModelId = "gpt-4o-mini";

/**
 * Retorna el modelo configurado via env o el default.
 * Env: AI_MODEL="gemini-2.0-flash"
 */
export function getActiveModelId(): AIModelId {
  const envModel = process.env.AI_MODEL as AIModelId | undefined;
  return envModel && envModel in AI_MODELS ? envModel : DEFAULT_MODEL;
}

export function getAnalysisModel(): LanguageModel {
  return AI_MODELS[getActiveModelId()]();
}
