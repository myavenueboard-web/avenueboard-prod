create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid null references public.profiles(id) on delete set null,
  tenant_access_id uuid null references public.tenant_access(id) on delete set null,
  property_id uuid null references public.properties(id) on delete set null,
  lease_id uuid null references public.leases(id) on delete set null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_conversations_status_check
    check (status in ('open', 'escalated', 'closed'))
);

create table if not exists public.support_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  role text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint support_conversation_messages_role_check
    check (role in ('user', 'assistant', 'system'))
);

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid null references public.support_tickets(id) on delete cascade,
  conversation_id uuid null references public.support_conversations(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.support_tickets
  add column if not exists conversation_id uuid null references public.support_conversations(id) on delete set null;

create index if not exists support_conversations_user_id_idx
  on public.support_conversations(user_id);

create index if not exists support_conversations_context_idx
  on public.support_conversations(property_id, lease_id, tenant_access_id);

create index if not exists support_conversation_messages_conversation_idx
  on public.support_conversation_messages(conversation_id, created_at);

create index if not exists support_ticket_events_ticket_idx
  on public.support_ticket_events(ticket_id, created_at desc);

create index if not exists support_ticket_events_conversation_idx
  on public.support_ticket_events(conversation_id, created_at desc);

create or replace function public.set_support_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_support_conversations_updated_at on public.support_conversations;

create trigger set_support_conversations_updated_at
before update on public.support_conversations
for each row
execute function public.set_support_conversations_updated_at();

alter table public.support_conversations enable row level security;
alter table public.support_conversation_messages enable row level security;
alter table public.support_ticket_events enable row level security;

drop policy if exists "users_can_read_own_support_conversations" on public.support_conversations;
drop policy if exists "admins_can_read_support_conversations" on public.support_conversations;
drop policy if exists "users_can_read_own_support_conversation_messages" on public.support_conversation_messages;
drop policy if exists "admins_can_read_support_conversation_messages" on public.support_conversation_messages;
drop policy if exists "admins_can_read_support_ticket_events" on public.support_ticket_events;

create policy "users_can_read_own_support_conversations"
on public.support_conversations
for select
to authenticated
using (user_id = auth.uid());

create policy "admins_can_read_support_conversations"
on public.support_conversations
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

create policy "users_can_read_own_support_conversation_messages"
on public.support_conversation_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.support_conversations sc
    where sc.id = support_conversation_messages.conversation_id
      and sc.user_id = auth.uid()
  )
);

create policy "admins_can_read_support_conversation_messages"
on public.support_conversation_messages
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

create policy "admins_can_read_support_ticket_events"
on public.support_ticket_events
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
