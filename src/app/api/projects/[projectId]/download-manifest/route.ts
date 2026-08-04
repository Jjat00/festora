import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildDownloadManifest, safeProjectName } from "@/lib/download-manifest";

/**
 * Lista de fotos + URLs prefirmadas para que el navegador arme el ZIP.
 * El servidor no toca los bytes: un proyecto de 5 GB no cabe en el tiempo
 * ni en el ancho de banda de una función serverless.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const type = req.nextUrl.searchParams.get("type") || "favorites";
  const category = req.nextUrl.searchParams.get("category");

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const select = {
    id: true,
    objectKey: true,
    originalFilename: true,
    size: true,
  } as const;

  let photos;
  if (type === "album" && category) {
    photos = await prisma.photo.findMany({
      where: { projectId, llmCategory: category },
      select,
      orderBy: { compositeScore: "desc" },
    });
  } else if (type === "favorites") {
    photos = await prisma.photo.findMany({
      where: { projectId, selection: { isNot: null } },
      select,
      orderBy: { order: "asc" },
    });
  } else {
    photos = await prisma.photo.findMany({
      where: { projectId },
      select,
      orderBy: { order: "asc" },
    });
  }

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No photos to download" },
      { status: 400 }
    );
  }

  const safeName = safeProjectName(project.name);
  const zipName =
    type === "album" && category
      ? `${safeName}-${category}.zip`
      : type === "favorites"
        ? `${safeName}-favoritas.zip`
        : `${safeName}.zip`;

  const manifest = await buildDownloadManifest(photos, zipName);

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "no-store" },
  });
}
