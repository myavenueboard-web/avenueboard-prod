alter table public.activity_logs enable row level security;

drop policy if exists "tenant_select_own_activity_logs" on public.activity_logs;
drop policy if exists "tenant_insert_own_activity_logs" on public.activity_logs;
drop policy if exists "landlord_select_owned_activity_logs" on public.activity_logs;
drop policy if exists "landlord_insert_owned_activity_logs" on public.activity_logs;
drop policy if exists "landlord_update_owned_activity_logs" on public.activity_logs;
drop policy if exists "landlord_delete_owned_activity_logs" on public.activity_logs;

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
    when tenant_access_has_status then 'and ta.status = ''accepted'''
    when tenant_access_has_invite_status then 'and ta.invite_status = ''accepted'''
    else ''
  end;

  execute format($policy$
    create policy "tenant_select_own_activity_logs"
    on public.activity_logs
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        join public.tenant_access ta
          on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and ta.property_id = activity_logs.property_id
          and ta.lease_id = activity_logs.lease_id
          %s
      )
    )
  $policy$, accepted_clause);

  execute format($policy$
    create policy "tenant_insert_own_activity_logs"
    on public.activity_logs
    for insert
    to authenticated
    with check (
      activity_type in (
        'note_added',
        'note_deleted',
        'document_uploaded',
        'document_deleted'
      )
      and exists (
        select 1
        from public.profiles p
        join public.tenant_access ta
          on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and p.id = activity_logs.profile_id
          and ta.property_id = activity_logs.property_id
          and ta.lease_id = activity_logs.lease_id
          %s
      )
    )
  $policy$, accepted_clause);
end $$;

create policy "landlord_select_owned_activity_logs"
on public.activity_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = activity_logs.property_id
  )
);

create policy "landlord_insert_owned_activity_logs"
on public.activity_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and p.id = activity_logs.profile_id
      and pr.id = activity_logs.property_id
  )
);

create policy "landlord_update_owned_activity_logs"
on public.activity_logs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = activity_logs.property_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = activity_logs.property_id
  )
);

create policy "landlord_delete_owned_activity_logs"
on public.activity_logs
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr
      on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id = activity_logs.property_id
  )
);
