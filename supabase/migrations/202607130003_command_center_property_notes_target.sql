alter table public.command_center_internal_notes
  drop constraint if exists command_center_internal_notes_target_type_check;

alter table public.command_center_internal_notes
  add constraint command_center_internal_notes_target_type_check
    check (target_type in ('profile', 'property'));
