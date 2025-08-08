begin;

-- Re-crear la FK de user_collection.user_id para que apunte a auth.users(id)
alter table if exists public.user_collection
  drop constraint if exists user_collection_user_id_fkey;

alter table if exists public.user_collection
  add constraint user_collection_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

commit; 