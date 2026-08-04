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

  const select = {
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
        "Content-Length": String(photos[0].size),
        "X-Total-Size": String(photos[0].size),
        "Access-Control-Expose-Headers": "X-Total-Size",
      },
    });
  }

  // Estimar tamaño total del ZIP (store mode, sin compresión):
  // - Cada archivo: local header ~30 + filename + data + central dir entry ~46 + filename
  // - EOCD: 22 bytes
  const filesBytes = photos.reduce((sum, p) => sum + p.size, 0);
  const overheadBytes = photos.reduce(
    (sum, p) => sum + 76 + 2 * Buffer.byteLength(p.originalFilename, "utf8"),
    22
  );
  const estimatedTotal = filesBytes + overheadBytes;

  // Multiple photos: stream as ZIP
  const archive = archiver("zip", { store: true });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  let cancelled = false;
  function cleanup() {
    cancelled = true;
    try {
      archive.abort();
    } catch {
      // ignore
    }
    passthrough.destroy();
  }

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
      if (cancelled) break;
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
    if (!cancelled) {
      try {
        await archive.finalize();
      } catch {
        // archive aborted
      }
    }
  })();

  const webStream = new ReadableStream({
    start(controller) {
      let closed = false;
      passthrough.on("data", (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      });
      passthrough.on("end", () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
      passthrough.on("error", (err) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(err);
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
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
      "X-Total-Size": String(estimatedTotal),
      "Access-Control-Expose-Headers": "X-Total-Size",
    },
  });
}
