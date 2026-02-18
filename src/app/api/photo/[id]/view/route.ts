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
    select: { objectKey: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signedUrl = await getSignedReadUrl(photo.objectKey);
  const response = NextResponse.redirect(signedUrl);
  // Cache for 55 min (presigned URL TTL is 60 min — leave 5 min margin)
  response.headers.set("Cache-Control", "private, max-age=3300, immutable");
  return response;
}
