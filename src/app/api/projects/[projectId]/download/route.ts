import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { r2Client } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get photos based on type
  const photos =
    type === "favorites"
      ? await prisma.photo.findMany({
          where: {
            projectId,
            selection: { isNot: null },
          },
          select: { objectKey: true, originalFilename: true },
          orderBy: { order: "asc" },
        })
      : await prisma.photo.findMany({
          where: { projectId },
          select: { objectKey: true, originalFilename: true },
          orderBy: { order: "asc" },
        });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos to download" }, { status: 400 });
  }

  // For single photo, stream directly
  if (photos.length === 1) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: photos[0].objectKey,
    });
    const response = await r2Client.send(command);

    return new NextResponse(response.Body as ReadableStream, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Content-Disposition": `attachment; filename="${photos[0].originalFilename}"`,
      },
    });
  }

  // For multiple photos, return JSON with download info
  // ZIP generation would be handled client-side or via a worker
  const photoList = photos.map((p) => ({
    objectKey: p.objectKey,
    filename: p.originalFilename,
  }));

  return NextResponse.json({
    projectName: project.name,
    type,
    photos: photoList,
    count: photoList.length,
  });
}
