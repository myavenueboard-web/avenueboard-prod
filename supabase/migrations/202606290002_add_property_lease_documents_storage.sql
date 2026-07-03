-- Lease setup fields, safe if 202606290001 was already applied.
alter table public.leases
  add column if not exists lease_setup_type text not null default 'new',
  add column if not exists payment_tracking_start_date date;

alter table public.leases
  drop constraint if exists leases_lease_setup_type_check;

alter table public.leases
  add constraint leases_lease_setup_type_check
  check (lease_setup_type in ('new', 'existing'));

-- Additional amounts used by Add Property and property edit flows.
create table if not exists public.lease_amounts (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  amount_type text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists lease_amounts_lease_id_idx
  on public.lease_amounts(lease_id);

alter table public.lease_amounts enable row level security;

drop policy if exists "landlord_select_owned_lease_amounts" on public.lease_amounts;
drop policy if exists "landlord_insert_owned_lease_amounts" on public.lease_amounts;
drop policy if exists "landlord_update_owned_lease_amounts" on public.lease_amounts;
drop policy if exists "landlord_delete_owned_lease_amounts" on public.lease_amounts;
drop policy if exists "tenant_select_own_lease_amounts" on public.lease_amounts;

create policy "landlord_select_owned_lease_amounts"
on public.lease_amounts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr on pr.owner_profile_id = p.id
    join public.leases l on l.property_id = pr.id
    where p.user_id = auth.uid()
      and l.id = lease_amounts.lease_id
  )
);

create policy "landlord_insert_owned_lease_amounts"
on public.lease_amounts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.properties pr on pr.owner_profile_id = p.id
    join public.leases l on l.property_id = pr.id
    where p.user_id = auth.uid()
      and l.id = lease_amounts.lease_id
  )
);

create policy "landlord_update_owned_lease_amounts"
on public.lease_amounts
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr on pr.owner_profile_id = p.id
    join public.leases l on l.property_id = pr.id
    where p.user_id = auth.uid()
      and l.id = lease_amounts.lease_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.properties pr on pr.owner_profile_id = p.id
    join public.leases l on l.property_id = pr.id
    where p.user_id = auth.uid()
      and l.id = lease_amounts.lease_id
  )
);

create policy "landlord_delete_owned_lease_amounts"
on public.lease_amounts
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.properties pr on pr.owner_profile_id = p.id
    join public.leases l on l.property_id = pr.id
    where p.user_id = auth.uid()
      and l.id = lease_amounts.lease_id
  )
);

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
    create policy "tenant_select_own_lease_amounts"
    on public.lease_amounts
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        join public.tenant_access ta on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and ta.lease_id = lease_amounts.lease_id
          %s
      )
    )
  $policy$, accepted_clause);
end $$;

-- Lease document table columns required by dashboard upload/view/download/delete.
create table if not exists public.lease_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete cascade,
  file_name text not null,
  file_url text,
  file_type text,
  file_size bigint,
  storage_path text,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.lease_documents
  add column if not exists property_id uuid references public.properties(id) on delete cascade,
  add column if not exists lease_id uuid references public.leases(id) on delete cascade,
  add column if not exists file_name text,
  add column if not exists file_url text,
  add column if not exists file_type text,
  add column if not exists file_size bigint,
  add column if not exists storage_path text,
  add column if not exists uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists lease_documents_property_id_idx
  on public.lease_documents(property_id);

create index if not exists lease_documents_lease_id_idx
  on public.lease_documents(lease_id);

create index if not exists lease_documents_storage_path_idx
  on public.lease_documents(storage_path);

-- Storage bucket used by Add Property and Property Documents.
insert into storage.buckets (id, name, public)
values ('lease-documents', 'lease-documents', false)
on conflict (id) do nothing;

drop policy if exists "landlords_can_upload_lease_documents" on storage.objects;
drop policy if exists "tenants_can_upload_lease_documents" on storage.objects;
drop policy if exists "users_can_read_linked_lease_documents" on storage.objects;
drop policy if exists "users_can_delete_linked_lease_documents" on storage.objects;

create policy "landlords_can_upload_lease_documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lease-documents'
  and exists (
    select 1
    from public.profiles p
    join public.properties pr on pr.owner_profile_id = p.id
    where p.user_id = auth.uid()
      and pr.id::text = (storage.foldername(name))[1]
  )
);

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
    create policy "tenants_can_upload_lease_documents"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'lease-documents'
      and exists (
        select 1
        from public.profiles p
        join public.tenant_access ta on ta.tenant_profile_id = p.id
        where p.user_id = auth.uid()
          and ta.property_id::text = (storage.foldername(name))[1]
          %s
      )
    )
  $policy$, accepted_clause);

  execute format($policy$
    create policy "users_can_read_linked_lease_documents"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'lease-documents'
      and exists (
        select 1
        from public.lease_documents d
        left join public.profiles p on p.user_id = auth.uid()
        left join public.properties pr on pr.id = d.property_id
        left join public.tenant_access ta
          on ta.property_id = d.property_id
         and ta.lease_id = d.lease_id
         and ta.tenant_profile_id = p.id
        where d.storage_path = storage.objects.name
          and (
            pr.owner_profile_id = p.id
            or (
              ta.id is not null
              %s
            )
          )
      )
    )
  $policy$, accepted_clause);

  execute format($policy$
    create policy "users_can_delete_linked_lease_documents"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'lease-documents'
      and (
        exists (
          select 1
          from public.lease_documents d
          join public.profiles p on p.user_id = auth.uid()
          left join public.properties pr on pr.id = d.property_id
          where d.storage_path = storage.objects.name
            and (
              pr.owner_profile_id = p.id
              or d.uploaded_by_profile_id = p.id
            )
        )
        or exists (
          select 1
          from public.profiles p
          join public.properties pr on pr.owner_profile_id = p.id
          where p.user_id = auth.uid()
            and pr.id::text = (storage.foldername(name))[1]
        )
        or exists (
          select 1
          from public.profiles p
          join public.tenant_access ta on ta.tenant_profile_id = p.id
          where p.user_id = auth.uid()
            and ta.property_id::text = (storage.foldername(name))[1]
            %s
        )
      )
    )
  $policy$, accepted_clause);
end $$;
