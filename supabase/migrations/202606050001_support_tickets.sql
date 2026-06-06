create sequence if not exists public.support_ticket_number_seq start 1;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null default (
    'AB-' ||
    to_char(now(), 'YYYY') ||
    '-' ||
    lpad(nextval('public.support_ticket_number_seq')::text, 6, '0')
  ),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid null references public.profiles(id) on delete set null,
  tenant_access_id uuid null references public.tenant_access(id) on delete set null,
  property_id uuid null references public.properties(id) on delete set null,
  lease_id uuid null references public.leases(id) on delete set null,
  category text not null default 'general',
  message text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_status_check
    check (status in ('open', 'in_review', 'resolved')),
  constraint support_tickets_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'))
);

create index if not exists support_tickets_user_id_idx
  on public.support_tickets(user_id);

create index if not exists support_tickets_profile_id_idx
  on public.support_tickets(profile_id);

create index if not exists support_tickets_context_idx
  on public.support_tickets(property_id, lease_id, tenant_access_id);

create index if not exists support_tickets_status_created_idx
  on public.support_tickets(status, created_at desc);

create or replace function public.set_support_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;

create trigger set_support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.set_support_tickets_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "tenants_can_read_own_support_tickets" on public.support_tickets;
drop policy if exists "tenants_can_create_own_support_tickets" on public.support_tickets;
drop policy if exists "admins_can_read_support_tickets" on public.support_tickets;
drop policy if exists "admins_can_update_support_tickets" on public.support_tickets;

create policy "tenants_can_read_own_support_tickets"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());

create policy "tenants_can_create_own_support_tickets"
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());

create policy "admins_can_read_support_tickets"
on public.support_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    join public.profiles p on p.email = au.email
    where p.user_id = auth.uid()
      and au.status = 'active'
  )
);

create policy "admins_can_update_support_tickets"
on public.support_tickets
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    join public.profiles p on p.email = au.email
    where p.user_id = auth.uid()
      and au.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    join public.profiles p on p.email = au.email
    where p.user_id = auth.uid()
      and au.status = 'active'
  )
);
