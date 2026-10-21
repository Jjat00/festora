import { NextResponse } from "next/server";
import { processEmbeddingBatch } from "@/lib/actions/embedding-actions";
import { cleanupExpiredGuestUploads } from "@/lib/guest-upload";

/**
 * Cron job que procesa fotos pendientes de embeddings.
 * Configurado en vercel.json para correr cada minuto.
 * Protegido con CRON_SECRET para evitar ejecución no autorizada.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // De paso barre las subidas de invitados vencidas, para que su staging no se quede ocupando el bucket
    const guestStagingCleared = await cleanupExpiredGuestUploads().catch((err) => {
      console.error("[guest-staging] Error:", err);
      return 0;
    });
    const result = { ...(await processEmbeddingBatch()), guestStagingCleared };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[embedding-cron] Error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
