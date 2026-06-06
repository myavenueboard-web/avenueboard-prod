create table if not exists public.ava_response_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  profile_id uuid null references public.profiles(id) on delete set null,
  conversation_id uuid null references public.support_conversations(id) on delete set null,
  question text not null,
  response text not null,
  feedback_flag text not null default 'unreviewed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ava_response_reviews_feedback_flag_check
    check (feedback_flag in ('unreviewed', 'accurate', 'inaccurate', 'hallucination', 'needs_prompt_tuning'))
);

create index if not exists ava_response_reviews_conversation_idx
  on public.ava_response_reviews(conversation_id, created_at desc);

create index if not exists ava_response_reviews_feedback_idx
  on public.ava_response_reviews(feedback_flag, created_at desc);

alter table public.ava_response_reviews enable row level security;

drop policy if exists "admins_can_read_ava_response_reviews" on public.ava_response_reviews;
drop policy if exists "admins_can_update_ava_response_reviews" on public.ava_response_reviews;

create policy "admins_can_read_ava_response_reviews"
on public.ava_response_reviews
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

create policy "admins_can_update_ava_response_reviews"
on public.ava_response_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    join public.profiles p on p.email = au.email
    where p.user_id = auth.uid()
      and au.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    join public.profiles p on p.email = au.email
    where p.user_id = auth.uid()
      and au.status = 'active'
  )
);
