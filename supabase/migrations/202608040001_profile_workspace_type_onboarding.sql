do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'workspace_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.workspace_type as enum (
      'self_managing_landlord',
      'property_manager',
      'resident'
    );
  end if;
end;
$$;

create table if not exists public.user_workspace_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_workspace_type public.workspace_type not null,
  onboarding_completed boolean not null default true,
  workspace_type_selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_workspace_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_workspace_preferences_updated_at
  on public.user_workspace_preferences;

create trigger set_user_workspace_preferences_updated_at
before update on public.user_workspace_preferences
for each row
execute function public.set_user_workspace_preferences_updated_at();

alter table public.user_workspace_preferences enable row level security;

drop policy if exists "users_can_read_own_workspace_preference"
  on public.user_workspace_preferences;
drop policy if exists "users_can_insert_own_workspace_preference"
  on public.user_workspace_preferences;

create policy "users_can_read_own_workspace_preference"
on public.user_workspace_preferences
for select
to authenticated
using (user_id = auth.uid());

create policy "users_can_insert_own_workspace_preference"
on public.user_workspace_preferences
for insert
to authenticated
with check (user_id = auth.uid());
