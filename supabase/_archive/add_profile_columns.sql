-- Add missing columns to profiles table
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table profiles add column avatar_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'position') then
    alter table profiles add column position text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'department') then
    alter table profiles add column department text;
  end if;
end $$;
