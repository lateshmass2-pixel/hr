-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- User Roles Enum
create type user_role as enum ('HR_ADMIN', 'EMPLOYEE');

-- Task Status Enum
create type task_status as enum ('TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED');

-- Application Status Enum
create type application_status as enum ('NEW', 'SCREENING', 'SHORTLISTED', 'REJECTED', 'INTERVIEW', 'OFFER_PENDING_APPROVAL', 'OFFER_SENT', 'HIRED');

-- Profiles Table (Linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role user_role default 'EMPLOYEE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects Table
create table projects (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text default 'ACTIVE',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Tasks Table
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  priority text default 'MEDIUM',
  status task_status default 'TODO',
  deadline timestamptz,
  project_id uuid references projects(id) on delete cascade,
  assignee_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Work Logs Table
create table work_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  date date default CURRENT_DATE,
  content text not null,
  manager_feedback text,
  status text default 'PENDING', -- PENDING, APPROVED, CHANGES_REQUESTED
  created_at timestamptz default now()
);

-- Job Postings (Public)
create table job_postings (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  department text,
  description text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Applications
create table applications (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references job_postings(id),
  candidate_name text not null,
  candidate_email text not null,
  resume_url text, -- Link to Supabase Storage
  resume_text text, -- Extracted text for AI
  score int, -- AI Score (0-100)
  status application_status default 'NEW',
  reviews jsonb, -- Array of interviewer feedback
  draft_offer_content text, -- AI generated offer letter
  created_at timestamptz default now()
);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'EMPLOYEE');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
