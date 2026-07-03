alter table public.properties
  add column if not exists creation_submission_id text;

create unique index if not exists properties_owner_creation_submission_uidx
  on public.properties(owner_profile_id, creation_submission_id)
  where creation_submission_id is not null;
