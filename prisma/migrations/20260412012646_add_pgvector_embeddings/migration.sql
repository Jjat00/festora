-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "embedding" vector(768),
ADD COLUMN     "embeddingStatus" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex (HNSW for fast cosine similarity search)
CREATE INDEX "Photo_embedding_idx" ON "Photo"
USING hnsw (embedding vector_cosine_ops);
