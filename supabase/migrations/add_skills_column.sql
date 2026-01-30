-- Add skills column to applications table
alter table applications add column if not exists skills text[];
