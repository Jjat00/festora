-- CreateIndex (HNSW for fast cosine similarity search)
CREATE INDEX IF NOT EXISTS "Photo_embedding_idx" ON "Photo"
USING hnsw (embedding vector_cosine_ops);
