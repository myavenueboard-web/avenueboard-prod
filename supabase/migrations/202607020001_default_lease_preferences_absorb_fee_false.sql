update public.lease_preferences
set landlord_absorbs_fee = false
where landlord_absorbs_fee is null;

alter table public.lease_preferences
  alter column landlord_absorbs_fee set default false;

alter table public.lease_preferences
  alter column landlord_absorbs_fee set not null;
