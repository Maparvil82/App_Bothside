begin;

-- Asegurar que la FK de user_lists.user_id apunte a auth.users(id)
alter table if exists public.user_lists
  drop constraint if exists user_lists_user_id_fkey;

alter table if exists public.user_lists
  add constraint user_lists_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

commit; 