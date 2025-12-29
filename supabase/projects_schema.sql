-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Employees Table (Dummy Data Source)
create table if not exists employees (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null unique,
  role text default 'Employee',
  avatar_url text,
  created_at timestamptz default now()
);

-- Insert Dummy Employees
insert into employees (name, email, role, avatar_url)
values 
  ('Alice Johnson', 'alice@company.com', 'Senior Developer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
  ('Bob Smith', 'bob@company.com', 'Designer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
  ('Charlie Davis', 'charlie@company.com', 'Product Manager', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie')
on conflict (email) do nothing;

-- Projects Table Enhancements
-- Checking if table exists first to avoid errors, then altering if needed
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text default 'ACTIVE', -- ACTIVE, COMPLETED, ON_HOLD
  due_date timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Add due_date if it doesn't exist (idempotent check)
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'due_date') then
    alter table projects add column due_date timestamptz;
  end if;
end $$;

-- Tasks Table Enhancements
create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'TODO', -- TODO, IN_PROGRESS, REVIEW, DONE
  priority text default 'MEDIUM', -- LOW, MEDIUM, HIGH
  due_date timestamptz,
  assigned_to uuid references employees(id), -- Linking to our new dummy table
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add RLS Policies (Basic)
alter table projects enable row level security;
alter table tasks enable row level security;
alter table employees enable row level security;

-- Allow authenticated users to view/create everything for now (Admin mode)
create policy "Allow all authenticated access to projects" on projects for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access to tasks" on tasks for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access to employees" on employees for all using (auth.role() = 'authenticated');
