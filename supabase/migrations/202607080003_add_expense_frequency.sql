alter table public.expenses
  add column if not exists expense_frequency text not null default 'one-time';

update public.expenses
set expense_frequency = 'one-time'
where expense_frequency is null
   or expense_frequency not in ('one-time', 'recurring');

alter table public.expenses
  alter column expense_frequency set default 'one-time';

alter table public.expenses
  alter column expense_frequency set not null;

alter table public.expenses
  drop constraint if exists expenses_expense_frequency_check;

alter table public.expenses
  add constraint expenses_expense_frequency_check
  check (expense_frequency in ('one-time', 'recurring'));
