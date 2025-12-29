-- Enable RLS on all tables
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table work_logs enable row level security;
alter table job_postings enable row level security;
alter table applications enable row level security;

-- Helper Function to check if user is admin
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid() and role = 'HR_ADMIN'
  );
end;
$$ language plpgsql security definer;

-- ==========================
-- PROFILES POLICIES
-- ==========================
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- ==========================
-- PROJECTS POLICIES
-- ==========================
create policy "Admins can do everything on projects"
  on projects for all
  using ( is_admin() );

create policy "Employees can view projects"
  on projects for select
  using ( auth.role() = 'authenticated' );

-- ==========================
-- TASKS POLICIES
-- ==========================
create policy "Admins can do everything on tasks"
  on tasks for all
  using ( is_admin() );

create policy "Employees can view all tasks"
  on tasks for select
  using ( auth.role() = 'authenticated' );

create policy "Employees can update their own assigned tasks"
  on tasks for update
  using ( auth.uid() = assignee_id );

-- ==========================
-- WORK LOGS POLICIES
-- ==========================
create policy "Users can CRUD their own logs"
  on work_logs for all
  using ( auth.uid() = user_id );

create policy "Admins can view all logs"
  on work_logs for select
  using ( is_admin() );

create policy "Admins can update logs (feedback)"
  on work_logs for update
  using ( is_admin() );

-- ==========================
-- JOB POSTINGS POLICIES
-- ==========================
create policy "Public can view active jobs"
  on job_postings for select
  using ( true );

create policy "Admins can manage jobs"
  on job_postings for all
  using ( is_admin() );

-- ==========================
-- APPLICATIONS POLICIES
-- ==========================
create policy "Public can insert applications"
  on applications for insert
  with check ( true );

create policy "Admins can view applications"
  on applications for select
  using ( is_admin() );

create policy "Admins can update applications"
  on applications for update
  using ( is_admin() );
