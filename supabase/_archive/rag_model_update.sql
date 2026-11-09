-- Resize embedding column for BGE-M3 (1024 dimensions)
-- NOTE: This will truncate/invalidate existing data if any exists, but since we are in dev, we can just clear matching data or alter.
-- Since changing dimensions on vectors with data is tricky without recasting, we'll drop the index, alter logic, and recreate.

-- 1. Drop the index relying on the column
drop index if exists doc_embeddings_embedding_idx;

-- 2. Clear table (optional but safer to avoid dimension mismatch errors if data exists)
truncate table doc_embeddings;

-- 3. Alter column
alter table doc_embeddings 
alter column embedding type vector(1024);

-- 4. Recreate Index
create index doc_embeddings_embedding_idx 
on doc_embeddings 
using hnsw (embedding vector_cosine_ops);
