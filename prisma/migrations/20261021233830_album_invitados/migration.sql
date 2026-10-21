-- CreateEnum
CREATE TYPE "GuestUploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PhotoSource" AS ENUM ('OWNER', 'GUEST');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "source" "PhotoSource" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "thumbnailSize" INTEGER,
ADD COLUMN     "uploaderName" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "guestUploads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestUploadsUntil" TIMESTAMP(3),
ADD COLUMN     "storageLimit" BIGINT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'default';

-- CreateTable
CREATE TABLE "GuestUpload" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "ownerId" TEXT NOT NULL,
    "stagingKey" TEXT NOT NULL,
    "finalKey" TEXT NOT NULL,
    "finalThumbnailKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "GuestUploadStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "processingAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "stagingCleared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GuestUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestUpload_projectId_createdAt_idx" ON "GuestUpload"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestUpload_ownerId_stagingCleared_idx" ON "GuestUpload"("ownerId", "stagingCleared");

-- CreateIndex
CREATE INDEX "GuestUpload_expiresAt_stagingCleared_idx" ON "GuestUpload"("expiresAt", "stagingCleared");

-- AddForeignKey
ALTER TABLE "GuestUpload" ADD CONSTRAINT "GuestUpload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
