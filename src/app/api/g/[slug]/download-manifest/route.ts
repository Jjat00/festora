import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { buildDownloadManifest, safeProjectName } from "@/lib/download-manifest";

/**
 * Equivalente público del manifiesto del dashboard, protegido por el PIN de
 * la galería. Ver /api/projects/[projectId]/download-manifest.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const type =
    req.nextUrl.searchParams.get("type") === "favorites" ? "favorites" : "all";

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, name: true, pin: true, status: true },
  });

  if (!project || project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.pin) {
    const cookieStore = await cookies();
    const pinCookie = cookieStore.get(`festora_pin_${slug}`);
    if (!pinCookie || !(await verifyPinToken(pinCookie.value, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const photos = await prisma.photo.findMany({
    where: {
      projectId: project.id,
      ...(type === "favorites" ? { selection: { isNot: null } } : {}),
    },
    select: { id: true, objectKey: true, originalFilename: true, size: true },
    orderBy: { order: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No photos to download" },
      { status: 400 }
    );
  }

  const safeName = safeProjectName(project.name);
  const zipName =
    type === "favorites" ? `${safeName}-favoritas.zip` : `${safeName}.zip`;

  const manifest = await buildDownloadManifest(photos, zipName);

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "no-store" },
  });
}
