alter table public.leases
  add column if not exists lease_setup_type text not null default 'new',
  add column if not exists payment_tracking_start_date date;

alter table public.leases
  drop constraint if exists leases_lease_setup_type_check;

alter table public.leases
  add constraint leases_lease_setup_type_check
  check (lease_setup_type in ('new', 'existing'));
