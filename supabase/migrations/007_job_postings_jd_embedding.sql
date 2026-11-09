-- =====================================================
-- CACHE THE JOB-DESCRIPTION EMBEDDING ON job_postings
-- =====================================================
-- Precomputing each role's JD embedding (BGE-M3, 1024 dims) means we embed
-- the JD once at creation instead of on every resume upload / talent-pool
-- search. Resume matching then only needs to embed the resume.
--
-- Run this in the Supabase SQL editor. Requires pgvector (already enabled).

create extension if not exists vector;

alter table job_postings
  add column if not exists jd_embedding vector(1024);
