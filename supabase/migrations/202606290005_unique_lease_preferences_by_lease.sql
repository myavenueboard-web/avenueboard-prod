do $$
declare
  order_clause text := 'id desc';
begin
  if to_regclass('public.lease_preferences') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lease_preferences'
      and column_name = 'created_at'
  ) then
    order_clause := 'created_at desc nulls last, ' || order_clause;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lease_preferences'
      and column_name = 'updated_at'
  ) then
    order_clause := 'updated_at desc nulls last, ' || order_clause;
  end if;

  execute format(
    $sql$
      delete from public.lease_preferences lp
      using (
        select
          ctid,
          row_number() over (
            partition by lease_id
            order by %s
          ) as row_rank
        from public.lease_preferences
        where lease_id is not null
      ) ranked
      where lp.ctid = ranked.ctid
        and ranked.row_rank > 1
    $sql$,
    order_clause
  );
end $$;

drop index if exists public.lease_preferences_lease_id_unique_idx;

create unique index lease_preferences_lease_id_unique_idx
  on public.lease_preferences (lease_id);
