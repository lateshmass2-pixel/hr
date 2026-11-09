-- =====================================================
-- PERSISTENT RESUME EMBEDDINGS + JD COSINE MATCHING
-- =====================================================
-- Stores every resume HR uploads as a permanent vector embedding
-- (BGE-M3 = 1024 dims, same as doc_embeddings) so a candidate who is
-- not a fit for one role can be re-matched against any future job.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Requires the pgvector extension (already enabled by rag_setup.sql).

create extension if not exists vector;

-- 1. Persistent resume vector store (the "talent pool")
create table if not exists resume_embeddings (
  id              uuid primary key default gen_random_uuid(),
  candidate_name  text,
  candidate_email text unique,            -- upsert key: re-uploading a resume updates the row
  resume_url      text,                   -- link to the file in Supabase Storage
  resume_text     text,                   -- extracted plain text (pdf2json / PyMuPDF)
  skills          text[] default '{}',    -- keyword-extracted skills, for display/filtering only
  embedding       vector(1024),           -- BGE-M3 dense embedding of the resume
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. HNSW index for fast cosine-distance search
create index if not exists resume_embeddings_embedding_idx
  on resume_embeddings
  using hnsw (embedding vector_cosine_ops);

-- 3. Cosine-similarity search: rank stored resumes against a JD embedding.
--    similarity = 1 - cosine_distance, so 1.0 == identical, 0.0 == orthogonal.
create or replace function match_resumes (
  query_embedding vector(1024),
  match_threshold float default 0.0,
  match_count     int   default 20
)
returns table (
  id              uuid,
  candidate_name  text,
  candidate_email text,
  resume_url      text,
  resume_text     text,
  skills          text[],
  similarity      float
)
language plpgsql
as $$
begin
  return query
  select
    resume_embeddings.id,
    resume_embeddings.candidate_name,
    resume_embeddings.candidate_email,
    resume_embeddings.resume_url,
    resume_embeddings.resume_text,
    resume_embeddings.skills,
    1 - (resume_embeddings.embedding <=> query_embedding) as similarity
  from resume_embeddings
  where resume_embeddings.embedding is not null
    and 1 - (resume_embeddings.embedding <=> query_embedding) > match_threshold
  order by resume_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
