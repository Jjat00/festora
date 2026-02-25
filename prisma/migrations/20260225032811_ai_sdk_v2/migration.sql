/*
  Warnings:

  - You are about to drop the column `brisqueScore` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `nimaScore` on the `Photo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "brisqueScore",
DROP COLUMN "nimaScore",
ADD COLUMN     "llmCategory" TEXT,
ADD COLUMN     "llmTags" TEXT[];
