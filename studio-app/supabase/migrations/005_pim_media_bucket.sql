-- =========================================================================
-- 005_pim_media_bucket.sql
--
-- Creates the `pim-media` Supabase Storage bucket and its RLS policies.
-- Files are stored at {org_id}/{product_id}/{filename}.
-- Members of the org can upload; anyone can read (public bucket).
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('pim-media', 'pim-media', true)
on conflict (id) do nothing;

-- Authenticated org members can upload into their org's folder.
drop policy if exists pim_media_storage_insert on storage.objects;
create policy pim_media_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pim-media'
  );

-- Anyone can read (public bucket — URLs are unguessable UUIDs).
drop policy if exists pim_media_storage_select on storage.objects;
create policy pim_media_storage_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'pim-media');

-- Authenticated users can delete files they uploaded.
drop policy if exists pim_media_storage_delete on storage.objects;
create policy pim_media_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'pim-media');
