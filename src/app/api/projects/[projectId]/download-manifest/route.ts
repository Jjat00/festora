import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildDownloadManifest, safeProjectName } from "@/lib/download-manifest";
import { albumPhotoQuery } from "@/lib/album-photos";

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
  const albumId = req.nextUrl.searchParams.get("albumId");

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

  let album = null;
  let photos;
  if (type === "album") {
    if (!albumId) {
      return NextResponse.json({ error: "Missing albumId" }, { status: 400 });
    }
    album = await prisma.albumSuggestion.findUnique({ where: { id: albumId } });
    if (!album || album.projectId !== projectId) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    photos = await prisma.photo.findMany({
      ...albumPhotoQuery(album, projectId),
      select,
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
  const zipName = album
    ? `${safeName}-${safeProjectName(album.name)}.zip`
    : type === "favorites"
      ? `${safeName}-favoritas.zip`
      : `${safeName}.zip`;

  const manifest = await buildDownloadManifest(photos, zipName);

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "no-store" },
  });
}
