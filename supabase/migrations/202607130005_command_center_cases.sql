alter table public.support_tickets
  add column if not exists assigned_staff_user_id uuid null references public.staff_users(id) on delete set null,
  add column if not exists resolved_by_staff_user_id uuid null references public.staff_users(id) on delete set null,
  add column if not exists resolved_at timestamptz null,
  add column if not exists resolution_summary text null,
  add column if not exists last_customer_response_at timestamptz null,
  add column if not exists source text null;

alter table public.support_tickets
  drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (
    status in (
      'new',
      'open',
      'in_review',
      'waiting_on_customer',
      'waiting_on_avenueboard',
      'waiting_on_payment_partner',
      'escalated',
      'resolved',
      'closed'
    )
  );

alter table public.support_tickets
  drop constraint if exists support_tickets_priority_check;

alter table public.support_tickets
  add constraint support_tickets_priority_check
  check (
    priority in (
      'low',
      'normal',
      'high',
      'urgent',
      'standard',
      'important',
      'time_sensitive',
      'critical'
    )
  );

create index if not exists support_tickets_assigned_staff_idx
  on public.support_tickets(assigned_staff_user_id, status, updated_at desc);

create index if not exists support_tickets_priority_status_idx
  on public.support_tickets(priority, status, updated_at desc);

create index if not exists support_tickets_last_customer_response_idx
  on public.support_tickets(last_customer_response_at desc);

alter table public.command_center_internal_notes
  drop constraint if exists command_center_internal_notes_target_type_check;

alter table public.command_center_internal_notes
  add constraint command_center_internal_notes_target_type_check
  check (target_type in ('profile', 'property', 'payment', 'case'));
