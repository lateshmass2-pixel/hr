-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. Create Assessment Sessions Context Tables
-- Tracks one full test session
create table if not exists assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid, -- Link to job_postings if applicable
  candidate_id uuid, -- Link to profiles/candidates
  difficulty text check (difficulty in ('Junior', 'Mid', 'Senior')),
  llm_model text,
  retrieved_chunk_ids uuid[], -- Array of chunks used for this session
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  total_score float
);

-- Stores AI-generated questions for that session
create table if not exists assessment_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references assessment_sessions(id) on delete cascade,
  question_text text not null,
  question_type text check (question_type in ('mcq', 'true_false', 'short_answer')),
  options jsonb, -- ["Option A", "Option B", ...] or null
  correct_answer text,
  source_chunk_id uuid, -- Link to specific KB chunk for citation
  created_at timestamp with time zone default now()
);

-- Stores what candidate answered
create table if not exists candidate_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references assessment_sessions(id) on delete cascade,
  question_id uuid references assessment_questions(id) on delete cascade,
  candidate_id uuid,
  answer_text text,
  is_correct boolean,
  similarity_score float, -- For partial credit validation
  answered_at timestamp with time zone default now()
);


-- 2. Knowledge Base (RAG) Vector Store
create table if not exists doc_embeddings (
  id uuid primary key default gen_random_uuid(),
  content text, -- The actual text chunk
  metadata jsonb, -- { "filename": "...", "page": 1, "source_type": "pdf" }
  embedding vector(1536) -- Using OpenAI's text-embedding-3-small dimension (change to 768 for Gemma/others if needed)
);

-- optimize querying with HNSW index
create index on doc_embeddings using hnsw (embedding vector_cosine_ops);

-- 3. Similarity Search Function (RPC)
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    doc_embeddings.id,
    doc_embeddings.content,
    doc_embeddings.metadata,
    1 - (doc_embeddings.embedding <=> query_embedding) as similarity
  from doc_embeddings
  where 1 - (doc_embeddings.embedding <=> query_embedding) > match_threshold
  order by doc_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
