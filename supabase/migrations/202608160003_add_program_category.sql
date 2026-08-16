-- Repair staging databases created before the Release 1 program category field.
alter table public.programs
  add column if not exists category text not null default 'General';
