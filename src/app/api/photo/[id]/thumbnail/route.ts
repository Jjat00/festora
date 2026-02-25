import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedReadUrl } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { thumbnailKey: true, objectKey: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = photo.thumbnailKey ?? photo.objectKey;
  const signedUrl = await getSignedReadUrl(key);
  // Redirigir a la presigned URL de R2
  // No cachear el redirect — el browser debe pedir una URL fresca en cada reload.
  // La imagen en sí se cachea por R2/CDN con sus propios headers.
  const response = NextResponse.redirect(signedUrl, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
