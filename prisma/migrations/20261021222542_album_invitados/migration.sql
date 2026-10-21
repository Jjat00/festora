-- CreateEnum
CREATE TYPE "PhotoSource" AS ENUM ('OWNER', 'GUEST');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "source" "PhotoSource" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "uploaderName" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "guestUploads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestUploadsUntil" TIMESTAMP(3),
ADD COLUMN     "storageLimit" BIGINT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'default';
