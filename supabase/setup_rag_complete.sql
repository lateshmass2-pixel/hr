-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create tables for Assessment Logic (if they don't exist)
create table if not exists assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  job_id text, -- Can be linked to a jobs table later
  candidate_id text not null,
  difficulty text check (difficulty in ('Junior', 'Mid', 'Senior')),
  llm_model text,
  retrieved_chunk_ids uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists assessment_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references assessment_sessions(id) on delete cascade,
  question_text text not null,
  question_type text check (question_type in ('mcq', 'true_false', 'short_answer')),
  options jsonb, -- For MCQ options
  correct_answer text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists candidate_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references assessment_sessions(id) on delete cascade,
  question_id uuid references assessment_questions(id) on delete cascade,
  candidate_id text not null,
  answer_text text,
  is_correct boolean,
  similarity_score float,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Vector Store for RAG (BGE-M3 uses 1024 dimensions)
-- Check if table exists to safely handle re-runs
create table if not exists doc_embeddings (
  id uuid primary key default gen_random_uuid(),
  content text, 
  metadata jsonb, 
  embedding vector(1024) 
);

-- 4. Create Search Function (RPC)
create or replace function match_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
) returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql stable as $$
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

-- 5. Create Metadata Index for faster filtering (Optional but recommended)
create index if not exists idx_doc_embeddings_metadata on doc_embeddings using gin (metadata);

-- 6. Create HNSW Index (Drop first to ensure clean state if re-running with different dims)
drop index if exists doc_embeddings_embedding_idx;
create index doc_embeddings_embedding_idx 
on doc_embeddings 
using hnsw (embedding vector_cosine_ops);

-- 7. Storage Bucket Setup
insert into storage.buckets (id, name, public)
values ('kb-documents', 'kb-documents', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload KB docs"
on storage.objects for insert to authenticated
with check (bucket_id = 'kb-documents');

create policy "Authenticated users can read KB docs"
on storage.objects for select to authenticated
using (bucket_id = 'kb-documents');

create policy "Authenticated users can delete KB docs"
on storage.objects for delete to authenticated
using (bucket_id = 'kb-documents');
