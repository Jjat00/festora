import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { r2Client } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

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

  const category = req.nextUrl.searchParams.get("category");

  let photos;
  if (type === "album" && category) {
    photos = await prisma.photo.findMany({
      where: { projectId, llmCategory: category },
      select: { objectKey: true, originalFilename: true },
      orderBy: { compositeScore: "desc" },
    });
  } else if (type === "favorites") {
    photos = await prisma.photo.findMany({
      where: { projectId, selection: { isNot: null } },
      select: { objectKey: true, originalFilename: true },
      orderBy: { order: "asc" },
    });
  } else {
    photos = await prisma.photo.findMany({
      where: { projectId },
      select: { objectKey: true, originalFilename: true },
      orderBy: { order: "asc" },
    });
  }

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No photos to download" },
      { status: 400 }
    );
  }

  // Single photo: stream directly
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

  // Multiple photos: stream as ZIP
  const archive = archiver("zip", { store: true });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // Deduplicate filenames
  const usedNames = new Map<string, number>();
  function uniqueName(name: string): string {
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    if (dot === -1) return `${name} (${count})`;
    return `${name.slice(0, dot)} (${count})${name.slice(dot)}`;
  }

  (async () => {
    for (const photo of photos) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: photo.objectKey,
        });
        const response = await r2Client.send(command);
        const body = response.Body;
        if (!body) continue;
        const nodeStream = body instanceof Readable
          ? body
          : Readable.fromWeb(body as unknown as import("stream/web").ReadableStream);
        archive.append(nodeStream, { name: uniqueName(photo.originalFilename) });
      } catch {
        // Skip failed files
      }
    }
    await archive.finalize();
  })();

  const webStream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      passthrough.on("end", () => controller.close());
      passthrough.on("error", (err) => controller.error(err));
    },
  });

  const safeName = project.name.replace(/[^a-zA-Z0-9_\- ]/g, "");
  const filename =
    type === "album" && category
      ? `${safeName}-${category}.zip`
      : type === "favorites"
        ? `${safeName}-favoritas.zip`
        : `${safeName}.zip`;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
