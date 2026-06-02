alter table public.property_notes enable row level security;
alter table public.lease_documents enable row level security;

drop policy if exists "tenant_delete_own_property_notes" on public.property_notes;
drop policy if exists "tenant_delete_own_lease_documents" on public.lease_documents;

create policy "tenant_delete_own_property_notes"
on public.property_notes
for delete
to authenticated
using (
  created_by_role = 'tenant'
  and note_type in ('private', 'shared')
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.id = property_notes.profile_id
  )
);

create policy "tenant_delete_own_lease_documents"
on public.lease_documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.id = lease_documents.uploaded_by_profile_id
  )
);
