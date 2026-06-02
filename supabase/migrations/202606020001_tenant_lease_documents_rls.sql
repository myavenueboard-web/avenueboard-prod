alter table public.lease_documents enable row level security;

drop policy if exists "tenant_select_own_lease_documents" on public.lease_documents;
drop policy if exists "tenant_insert_own_lease_documents" on public.lease_documents;
drop policy if exists "landlord_select_owned_lease_documents" on public.lease_documents;
drop policy if exists "landlord_insert_owned_lease_documents" on public.lease_documents;
drop policy if exists "landlord_update_owned_lease_documents" on public.lease_documents;
drop policy if exists "landlord_delete_owned_lease_documents" on public.lease_documents;

do $$
declare
  tenant_access_has_status boolean;
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

  accepted_clause := case
    when tenant_access_has_status then 'and ta.status = ''accepted'''
    else ''
  end;

  execute format($policy$
    create policy "tenant_select_own_lease_documents"
    on public.lease_documents
    for select
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
      )
    )
  $policy$, accepted_clause);

  execute format($policy$
    create policy "tenant_insert_own_lease_documents"
    on public.lease_documents
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        join public.tenant_access ta
          on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and p.id = lease_documents.uploaded_by_profile_id
          and ta.property_id = lease_documents.property_id
          and ta.lease_id = lease_documents.lease_id
          %s
      )
    )
  $policy$, accepted_clause);
end $$;

create policy "landlord_select_owned_lease_documents"
on public.lease_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = lease_documents.property_id
  )
);

create policy "landlord_insert_owned_lease_documents"
on public.lease_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = lease_documents.property_id
      and p.id = lease_documents.uploaded_by_profile_id
  )
);

create policy "landlord_update_owned_lease_documents"
on public.lease_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = lease_documents.property_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = lease_documents.property_id
  )
);

create policy "landlord_delete_owned_lease_documents"
on public.lease_documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = lease_documents.property_id
  )
);
