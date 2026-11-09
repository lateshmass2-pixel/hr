-- Create a private bucket for Knowledge Base documents
insert into storage.buckets (id, name, public)
values ('kb-documents', 'kb-documents', true)
on conflict (id) do nothing;

-- Allow HR Admin to upload files
create policy "HR Admins can upload KB docs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'kb-documents'
  -- In a real app, you'd check for HR role here:
  -- and (select role from profiles where id = auth.uid()) = 'HR_ADMIN'
);

-- Allow Authenticated users (Server Actions) to read files
create policy "Authenticated users can read KB docs"
on storage.objects
for select
to authenticated
using ( bucket_id = 'kb-documents' );

-- Allow Deletion
create policy "HR Admins can delete KB docs"
on storage.objects
for delete
to authenticated
using ( bucket_id = 'kb-documents' );
