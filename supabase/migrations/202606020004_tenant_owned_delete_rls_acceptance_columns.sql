alter table public.property_notes enable row level security;
alter table public.lease_documents enable row level security;

drop policy if exists "tenant_delete_own_property_notes" on public.property_notes;
drop policy if exists "tenant_delete_own_lease_documents" on public.lease_documents;

do $$
declare
  tenant_access_has_status boolean;
  tenant_access_has_invite_status boolean;
  accepted_clause text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_access'
      and column_name = 'status'
  )
  into tenant_access_has_status;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_access'
      and column_name = 'invite_status'
  )
  into tenant_access_has_invite_status;

  accepted_clause := case
    when tenant_access_has_status and tenant_access_has_invite_status then
      'and (ta.status = ''accepted'' or ta.invite_status = ''accepted'')'
    when tenant_access_has_status then
      'and ta.status = ''accepted'''
    when tenant_access_has_invite_status then
      'and ta.invite_status = ''accepted'''
    else
      ''
  end;

  execute format($policy$
    create policy "tenant_delete_own_property_notes"
    on public.property_notes
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        join public.tenant_access ta
          on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and ta.property_id = property_notes.property_id
          and ta.lease_id = property_notes.lease_id
          %s
          and property_notes.profile_id = p.id
          and property_notes.created_by_role = 'tenant'
          and property_notes.note_type in ('private', 'shared')
      )
    )
  $policy$, accepted_clause);

  execute format($policy$
    create policy "tenant_delete_own_lease_documents"
    on public.lease_documents
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        join public.tenant_access ta
          on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and ta.property_id = lease_documents.property_id
          and ta.lease_id = lease_documents.lease_id
          %s
          and lease_documents.uploaded_by_profile_id = p.id
      )
    )
  $policy$, accepted_clause);
end $$;
