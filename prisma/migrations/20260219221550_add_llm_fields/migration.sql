-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "llmAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "llmDiscardReason" TEXT,
ADD COLUMN     "llmModel" TEXT,
ADD COLUMN     "llmScore" INTEGER,
ADD COLUMN     "llmSummary" TEXT;
