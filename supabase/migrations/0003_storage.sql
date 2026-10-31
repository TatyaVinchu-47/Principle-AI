-- ============================================================================
-- Storage: 'resumes' bucket (private) + per-user access policies
-- Run after 0001_init.sql.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Files are stored under a top-level folder equal to the user's id:
--   resumes/<user_id>/<filename>
-- The policies below restrict each user to their own folder.

do $$ begin
  create policy "resumes_insert_own"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "resumes_select_own"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "resumes_update_own"
    on storage.objects for update to authenticated
    using (
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "resumes_delete_own"
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;
