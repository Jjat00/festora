import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { r2Client } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const type = req.nextUrl.searchParams.get("type") === "favorites" ? "favorites" : "all";

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
    select: { objectKey: true, originalFilename: true, size: true },
    orderBy: { order: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos to download" }, { status: 400 });
  }

  const safeName = project.name.replace(/[^a-zA-Z0-9_\- ]/g, "");

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

  const archive = archiver("zip", { store: true });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

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

  const filename =
    type === "favorites" ? `${safeName}-favoritas.zip` : `${safeName}.zip`;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Total-Size": String(estimatedTotal),
      "Access-Control-Expose-Headers": "X-Total-Size",
    },
  });
}
