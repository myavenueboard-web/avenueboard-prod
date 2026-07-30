create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version integer not null,
  essential boolean not null default true,
  analytics boolean not null default false,
  marketing boolean not null default false,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cookie_consents_user_id_key unique (user_id),
  constraint cookie_consents_essential_true check (essential = true),
  constraint cookie_consents_source_check check (
    source in (
      'banner_accept_all',
      'banner_essential_only',
      'banner_close',
      'preferences_modal',
      'privacy_settings',
      'gpc'
    )
  )
);

alter table public.cookie_consents enable row level security;

drop policy if exists "Users can read own cookie consent" on public.cookie_consents;
create policy "Users can read own cookie consent"
  on public.cookie_consents
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own cookie consent" on public.cookie_consents;
create policy "Users can insert own cookie consent"
  on public.cookie_consents
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own cookie consent" on public.cookie_consents;
create policy "Users can update own cookie consent"
  on public.cookie_consents
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.set_cookie_consents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = coalesce(new.updated_at, now());
  return new;
end;
$$;

drop trigger if exists set_cookie_consents_updated_at on public.cookie_consents;
create trigger set_cookie_consents_updated_at
  before update on public.cookie_consents
  for each row
  execute function public.set_cookie_consents_updated_at();
