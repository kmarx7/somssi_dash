-- Supabase Storage policy migration. Kept separate from core PostgreSQL tests.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('somssi-evidence','somssi-evidence',false,10485760,array['application/octet-stream']);
create policy somssi_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='somssi-evidence' and (storage.foldername(name))[2]=(select auth.uid())::text and
  exists(select 1 from public.somssi_project_members m where m.project_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.active and m.role in ('owner','admin','editor'))
);
create policy somssi_evidence_read on storage.objects for select to authenticated using (
  bucket_id='somssi-evidence' and exists(select 1 from public.somssi_project_members m where m.project_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.active and
  (m.role in ('owner','admin') or (m.role='editor' and (storage.foldername(name))[2]=m.user_id::text)))
);
-- No UPDATE/DELETE policies: original evidence is never overwritten by a client.
