-- Migration: Add team_lead_id and member_ids to projects table
-- Run this in Supabase SQL Editor

-- Add team_lead_id column if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'team_lead_id') then
    alter table projects add column team_lead_id uuid references auth.users(id);
  end if;
end $$;

-- Add member_ids column (array of UUIDs) if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'member_ids') then
    alter table projects add column member_ids uuid[] default '{}';
  end if;
end $$;

-- Add progress column if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'progress') then
    alter table projects add column progress integer default 0;
  end if;
end $$;

-- Add proof_url and verification_status to tasks table
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'proof_url') then
    alter table tasks add column proof_url text;
  end if;
end $$;

do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'verification_status') then
    alter table tasks add column verification_status text default 'None'; -- None, Pending, Verified, Rejected
  end if;
end $$;
