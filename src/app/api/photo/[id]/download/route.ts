import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { r2Client } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { objectKey: true, originalFilename: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: photo.objectKey,
  });
  const response = await r2Client.send(command);

  return new NextResponse(response.Body as ReadableStream, {
    headers: {
      "Content-Type": response.ContentType || "image/jpeg",
      "Content-Disposition": `attachment; filename="${photo.originalFilename}"`,
    },
  });
}
