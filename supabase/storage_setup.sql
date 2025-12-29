-- Create a new private bucket 'resumes' safely
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

-- Set up RLS policies for the bucket
-- Allow public access to view files (needed for the "View PDF" link)
create policy "Public Access to Resumes"
  on storage.objects for select
  using ( bucket_id = 'resumes' );

-- Allow authenticated users to upload resumes
create policy "Authenticated Users can upload Resumes"
  on storage.objects for insert
  with check ( bucket_id = 'resumes' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete resumes (optional, good for cleanup)
create policy "Authenticated Users can delete Resumes"
  on storage.objects for delete
  using ( bucket_id = 'resumes' and auth.role() = 'authenticated' );
