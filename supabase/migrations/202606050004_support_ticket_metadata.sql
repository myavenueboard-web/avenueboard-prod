alter table public.support_tickets
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists support_tickets_metadata_gin_idx
  on public.support_tickets using gin (metadata);
