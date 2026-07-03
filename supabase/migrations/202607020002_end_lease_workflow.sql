alter table public.leases
  add column if not exists ended_at timestamptz;

alter table public.leases
  alter column lease_status set default 'active';

update public.leases
set lease_status = 'active'
where lease_status is null;

create index if not exists leases_property_lease_status_idx
  on public.leases(property_id, lease_status);
