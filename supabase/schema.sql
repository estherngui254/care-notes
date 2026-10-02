-- Plant Care Notes: database setup for Supabase.
--
-- Run this once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it only creates what is missing and refreshes the policies.

-- One row per plant. The whole plant (name, care note, photo, problems...) lives in `data`.
-- The key is (user_id, id), so two people can import the same backup file without clashing.
create table if not exists public.plants (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Row Level Security: the app's publishable key is public, so these rules are what keep
-- every person's plants private. Each signed-in person can only touch their own rows,
-- and nobody who is signed out can touch any.
alter table public.plants enable row level security;

revoke all on table public.plants from anon, authenticated;
grant select, insert, update, delete on table public.plants to authenticated;

drop policy if exists "Read own plants" on public.plants;
create policy "Read own plants" on public.plants
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Add own plants" on public.plants;
create policy "Add own plants" on public.plants
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Change own plants" on public.plants;
create policy "Change own plants" on public.plants
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own plants" on public.plants;
create policy "Delete own plants" on public.plants
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- "Delete account" in the app calls this. A browser cannot delete an auth user directly,
-- so this function does it for the signed-in person only. Their plants are removed with them.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
