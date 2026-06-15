alter table public.rent_payments
  add column if not exists profile_id uuid null references public.profiles(id) on delete set null,
  add column if not exists tenant_access_id uuid null references public.tenant_access(id) on delete set null,
  add column if not exists property_id uuid null references public.properties(id) on delete set null,
  add column if not exists rent_cycle_key text null,
  add column if not exists rent_cycle_month_label text null,
  add column if not exists rent_amount_cents integer null,
  add column if not exists tenant_service_fee_cents integer null,
  add column if not exists total_amount_cents integer null,
  add column if not exists stripe_checkout_session_id text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists source text null,
  add column if not exists updated_at timestamptz null;

update public.rent_payments
set rent_cycle_key = to_char(
  coalesce(paid_at, created_at, now())::date,
  'YYYY-MM'
)
where rent_cycle_key is null
  and period_label is null;

create unique index if not exists rent_payments_unique_tenant_cycle_idx
  on public.rent_payments(lease_id, tenant_access_id, rent_cycle_key)
  where tenant_access_id is not null
    and rent_cycle_key is not null
    and status in ('paid', 'succeeded', 'processing', 'pending');

create index if not exists rent_payments_cycle_idx
  on public.rent_payments(lease_id, tenant_access_id, rent_cycle_key);
