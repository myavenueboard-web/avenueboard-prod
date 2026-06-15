alter table public.payment_methods
  add column if not exists tenant_access_id uuid null references public.tenant_access(id) on delete set null,
  add column if not exists property_id uuid null references public.properties(id) on delete set null,
  add column if not exists stripe_customer_id text null,
  add column if not exists stripe_payment_method_id text null,
  add column if not exists autopay_status text not null default 'not_enrolled',
  add column if not exists autopay_enrolled boolean not null default false,
  add column if not exists updated_at timestamptz null;

create index if not exists payment_methods_tenant_access_idx
  on public.payment_methods(tenant_access_id);

create index if not exists payment_methods_stripe_payment_method_idx
  on public.payment_methods(stripe_payment_method_id);
