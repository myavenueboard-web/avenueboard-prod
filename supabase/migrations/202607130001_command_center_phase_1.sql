create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null,
  status text not null default 'invited',
  mfa_required boolean not null default true,
  invited_by uuid null references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz null,
  constraint staff_users_role_check
    check (role in ('super_admin', 'operations', 'support', 'payments', 'read_only')),
  constraint staff_users_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked'))
);

create index if not exists staff_users_auth_user_id_idx
  on public.staff_users(auth_user_id);

create index if not exists staff_users_email_idx
  on public.staff_users(lower(email));

create index if not exists staff_users_status_idx
  on public.staff_users(status);

create index if not exists staff_users_status_role_idx
  on public.staff_users(status, role);

create or replace function public.set_staff_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_staff_users_updated_at on public.staff_users;

create trigger set_staff_users_updated_at
before update on public.staff_users
for each row
execute function public.set_staff_users_updated_at();

create table if not exists public.command_center_audit_logs (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid null references public.staff_users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists command_center_audit_logs_staff_created_idx
  on public.command_center_audit_logs(staff_user_id, created_at desc);

create index if not exists command_center_audit_logs_action_created_idx
  on public.command_center_audit_logs(action, created_at desc);

create index if not exists command_center_audit_logs_created_idx
  on public.command_center_audit_logs(created_at desc);

create index if not exists command_center_audit_logs_target_idx
  on public.command_center_audit_logs(target_type, target_id, created_at desc);

alter table public.staff_users enable row level security;
alter table public.command_center_audit_logs enable row level security;

drop policy if exists "staff_can_read_own_staff_user" on public.staff_users;
drop policy if exists "privileged_staff_can_read_staff_users" on public.staff_users;
drop policy if exists "staff_can_insert_own_audit_logs" on public.command_center_audit_logs;
drop policy if exists "staff_can_read_own_audit_logs" on public.command_center_audit_logs;
drop policy if exists "privileged_staff_can_read_audit_logs" on public.command_center_audit_logs;

create policy "staff_can_read_own_staff_user"
on public.staff_users
for select
to authenticated
using (auth_user_id = auth.uid());

create policy "privileged_staff_can_read_staff_users"
on public.staff_users
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    where su.auth_user_id = auth.uid()
      and su.status = 'active'
      and su.role in ('super_admin', 'operations')
  )
);

create policy "staff_can_read_own_audit_logs"
on public.command_center_audit_logs
for select
to authenticated
using (
  staff_user_id in (
    select su.id
    from public.staff_users su
    where su.auth_user_id = auth.uid()
      and su.status = 'active'
  )
);

create policy "privileged_staff_can_read_audit_logs"
on public.command_center_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    where su.auth_user_id = auth.uid()
      and su.status = 'active'
      and su.role in ('super_admin', 'operations')
  )
);

comment on table public.staff_users is
  'Internal AvenueBoard Command Center staff identities. Bootstrap the first user with a manual insert linking auth.users.id to staff_users.auth_user_id.';

comment on table public.command_center_audit_logs is
  'Append-only internal Command Center audit log. Writes are performed by authorized server-side service-role code only; normal staff roles cannot insert, update, or delete audit records.';
