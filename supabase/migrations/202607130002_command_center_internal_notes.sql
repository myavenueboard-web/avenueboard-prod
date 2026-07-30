create table if not exists public.command_center_internal_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  staff_user_id uuid not null references public.staff_users(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz null,
  constraint command_center_internal_notes_target_type_check
    check (target_type in ('profile'))
);

create index if not exists command_center_internal_notes_target_idx
  on public.command_center_internal_notes(target_type, target_id, created_at desc);

create index if not exists command_center_internal_notes_staff_idx
  on public.command_center_internal_notes(staff_user_id, created_at desc);

create or replace function public.set_command_center_internal_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.note is distinct from old.note then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_command_center_internal_notes_updated_at
  on public.command_center_internal_notes;

create trigger set_command_center_internal_notes_updated_at
before update on public.command_center_internal_notes
for each row
execute function public.set_command_center_internal_notes_updated_at();

alter table public.command_center_internal_notes enable row level security;

drop policy if exists "active_staff_can_read_internal_notes"
  on public.command_center_internal_notes;

create policy "active_staff_can_read_internal_notes"
on public.command_center_internal_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    where su.auth_user_id = auth.uid()
      and su.status = 'active'
  )
);

comment on table public.command_center_internal_notes is
  'Internal-only Command Center notes. Customer-facing product code must never read this table. Writes are performed through authorized Command Center server code and audited.';
