import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const DESCRIPTION_MODEL = "gemini-3.1-flash-lite-preview";

const SYSTEM_PROMPT = `Describe la foto de manera limpia, concisa y objetiva en español.
Reglas:
- Una sola frase de 15-30 palabras.
- Menciona: sujetos principales, acción, escenario, ambiente, objetos relevantes.
- Sin opiniones de calidad ("hermosa", "excelente").
- Sin meta-descripción ("la imagen muestra", "se ve").
- Sin emojis ni signos de puntuación decorativos.
- Optimizada para búsqueda semántica: usa términos descriptivos comunes.

Ejemplos:
- "Novia con vestido blanco bailando vals con su padre en la pista del salón de recepción"
- "Pareja de novios riendo bajo árbol al atardecer en jardín exterior"
- "Mesa con centro floral blanco, copas de cristal y velas en recepción nocturna"
- "Niño jugando con globos rojos durante la fiesta infantil"`;

/**
 * Genera una descripción limpia de una foto usando un modelo ligero.
 * Optimizada para alimentar el embedding multimodal.
 */
export async function generatePhotoDescription(
  imageBase64: string,
  mimeType: "image/webp" | "image/jpeg" | "image/png",
): Promise<string> {
  const response = await ai.models.generateContent({
    model: DESCRIPTION_MODEL,
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: "Describe esta foto." },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 256,
      temperature: 0.2,
      thinkingConfig: { thinkingLevel: "low" },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    const finishReason = response.candidates?.[0]?.finishReason;
    const blockReason = response.promptFeedback?.blockReason;
    throw new Error(
      `Empty description from Gemini (finishReason=${finishReason ?? "unknown"}, blockReason=${blockReason ?? "none"})`,
    );
  }

  return text;
}
