alter table public.property_notes enable row level security;

drop policy if exists "tenant_select_property_notes" on public.property_notes;
drop policy if exists "tenant_insert_property_notes" on public.property_notes;

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
    create policy "tenant_select_property_notes"
    on public.property_notes
    for select
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
          and (
            (
              property_notes.created_by_role = 'tenant'
              and property_notes.note_type = 'private'
              and property_notes.profile_id = p.id
            )
            or property_notes.note_type = 'shared'
          )
      )
    )
  $policy$, accepted_clause);

  execute format($policy$
    create policy "tenant_insert_property_notes"
    on public.property_notes
    for insert
    to authenticated
    with check (
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
end $$;
