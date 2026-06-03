create extension if not exists pgcrypto;

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  recipient_email text not null,
  recipient_profile_id uuid null references public.profiles(id) on delete set null,
  related_property_id uuid null references public.properties(id) on delete set null,
  related_lease_id uuid null references public.leases(id) on delete set null,
  related_tenant_access_id uuid null references public.tenant_access(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz null,
  failed_at timestamptz null,
  error_message text null,
  provider_message_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_events_status_schedule_idx
  on public.email_events(status, scheduled_for);

create index if not exists email_events_recipient_idx
  on public.email_events(lower(recipient_email));

create index if not exists email_events_related_idx
  on public.email_events(related_property_id, related_lease_id, related_tenant_access_id);

create unique index if not exists email_events_wave1_idempotency_idx
  on public.email_events (
    event_type,
    lower(recipient_email),
    coalesce(related_property_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(related_lease_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(related_tenant_access_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where event_type in (
    'landlord_welcome',
    'tenant_welcome',
    'add_first_property_reminder',
    'tenant_invitation',
    'tenant_invite_reminder_24h',
    'tenant_invite_reminder_48h',
    'tenant_invite_reminder_72h',
    'lease_activated',
    'tenant_accepted_landlord_notification'
  );

create or replace function public.set_email_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_email_events_updated_at on public.email_events;

create trigger set_email_events_updated_at
before update on public.email_events
for each row
execute function public.set_email_events_updated_at();

alter table public.email_events enable row level security;
