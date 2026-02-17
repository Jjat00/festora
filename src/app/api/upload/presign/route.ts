import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getPresignedUploadUrl,
  getObjectKey,
  getThumbnailKey,
} from "@/lib/r2";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  DEFAULT_STORAGE_LIMIT,
} from "@/lib/constants";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, files } = body as {
    projectId: string;
    files: { filename: string; contentType: string; size?: number }[];
  };

  if (!projectId || !files?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify project ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check storage limit
  const [user, storageAggregate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { storageLimit: true },
    }),
    prisma.photo.aggregate({
      where: { project: { userId: session.user.id } },
      _sum: { size: true },
    }),
  ]);

  const storageLimit = Number(user?.storageLimit ?? DEFAULT_STORAGE_LIMIT);
  const currentUsage = storageAggregate._sum.size ?? 0;
  const uploadSize = files.reduce((sum, f) => sum + (f.size ?? 0), 0);

  if (currentUsage + uploadSize > storageLimit) {
    return NextResponse.json(
      {
        error: "STORAGE_LIMIT_EXCEEDED",
        used: currentUsage,
        limit: storageLimit,
      },
      { status: 403 }
    );
  }

  // Validate files
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.contentType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.contentType}` },
        { status: 400 }
      );
    }
    if (file.size && file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${file.filename}` },
        { status: 400 }
      );
    }
  }

  // Generate presigned URLs
  const presignedUrls = await Promise.all(
    files.map(async (file) => {
      const photoId = crypto.randomUUID();
      const ext = file.filename.split(".").pop() || "jpg";
      const objectKey = getObjectKey(
        session.user!.id!,
        projectId,
        photoId,
        ext
      );
      const thumbnailKey = getThumbnailKey(
        session.user!.id!,
        projectId,
        photoId
      );

      const [uploadUrl, thumbnailUploadUrl] = await Promise.all([
        getPresignedUploadUrl(objectKey, file.contentType),
        getPresignedUploadUrl(thumbnailKey, "image/webp"),
      ]);

      return { objectKey, thumbnailKey, uploadUrl, thumbnailUploadUrl };
    })
  );

  return NextResponse.json({ presignedUrls });
}
