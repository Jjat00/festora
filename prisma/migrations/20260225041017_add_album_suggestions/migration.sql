-- CreateTable
CREATE TABLE "AlbumSuggestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "coverPhotoId" TEXT,
    "photoCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbumSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlbumSuggestion_projectId_idx" ON "AlbumSuggestion"("projectId");

-- AddForeignKey
ALTER TABLE "AlbumSuggestion" ADD CONSTRAINT "AlbumSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
