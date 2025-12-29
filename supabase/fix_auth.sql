-- 1. Drop existing policies to prevent "already exists" errors
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can CRUD their own logs" on public.work_logs;

-- 2. Create Profiles Table (Safe if exists)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text default 'HR_ADMIN',
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Re-create Policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 5. Create/Update Trigger for New Users (Forcing HR_ADMIN for now)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'HR_ADMIN' -- Defaulting to HR_ADMIN for testing
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger first to ensure clean update
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
