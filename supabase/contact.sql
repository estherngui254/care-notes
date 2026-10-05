-- Plant Care Notes: contact the shop, updates and feedback.
--
-- Run this once after supabase/schema.sql (and supabase/orders.sql): Supabase dashboard -> SQL
-- Editor -> New query -> paste -> Run. It is safe to run again; it only creates what is missing and
-- refreshes the rules.
--
-- Three tables:
--   * messages  - a customer writes to the shop. Only the writer can read their own; the shop reads
--                 everything in the Supabase dashboard (Table Editor -> messages).
--   * message_replies - the shop's answer to a message. The dashboard writes it; the customer reads
--                 the replies to their own messages.
--   * feedback  - a review, complaint or compliment. Same privacy as messages (Table Editor ->
--                 feedback). Reviews carry a rating from 1 to 5; the other kinds carry none.
--   * news      - updates the shop posts. Every signed-in person can read them, and nobody can
--                 write them from the app: the shop adds them in the dashboard (Table Editor ->
--                 news -> Insert row). See docs/contact-and-feedback.md for ready-to-copy SQL.

-- ---------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------

create table if not exists public.messages (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  subject    text        not null check (char_length(subject) between 3 and 120),
  body       text        not null check (char_length(btrim(body)) between 10 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists messages_user_created on public.messages (user_id, created_at desc);

-- The shop's reply to a customer's message. Only the dashboard writes this table.
create table if not exists public.message_replies (
  id         uuid        primary key default gen_random_uuid(),
  message_id uuid        not null references public.messages (id) on delete cascade,
  body       text        not null check (char_length(btrim(body)) between 2 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists message_replies_message on public.message_replies (message_id, created_at);

create table if not exists public.feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('review', 'complaint', 'compliment')),
  -- Named explicitly: the rule reads kind as well as rating, so Postgres would call it feedback_check.
  rating     smallint    constraint feedback_rating_check check (
    (kind <> 'review' and rating is null)
    or (kind = 'review' and coalesce(rating between 1 and 5, false))
  ),
  body       text        not null check (char_length(btrim(body)) between 10 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_created on public.feedback (user_id, created_at desc);

create table if not exists public.news (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null check (char_length(title) between 3 and 120),
  body       text        not null check (char_length(btrim(body)) between 10 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists news_created on public.news (created_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Privacy rules (Row Level Security)
-- ---------------------------------------------------------------------------------------------------

alter table public.messages enable row level security;
alter table public.message_replies enable row level security;
alter table public.feedback enable row level security;
alter table public.news enable row level security;

revoke all on table public.messages from anon, authenticated;
revoke all on table public.message_replies from anon, authenticated;
revoke all on table public.feedback from anon, authenticated;
revoke all on table public.news from anon, authenticated;
grant select, insert on table public.messages to authenticated;
grant select on table public.message_replies to authenticated;
grant select, insert on table public.feedback to authenticated;
grant select on table public.news to authenticated;

drop policy if exists "Read own messages" on public.messages;
create policy "Read own messages" on public.messages
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Add own messages" on public.messages;
create policy "Add own messages" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- The shop writes replies from the dashboard; a customer reads only the replies to their own messages.
drop policy if exists "Read replies to own messages" on public.message_replies;
create policy "Read replies to own messages" on public.message_replies
  for select to authenticated
  using (exists (
    select 1 from public.messages m
    where m.id = public.message_replies.message_id and m.user_id = (select auth.uid())
  ));

drop policy if exists "Read own feedback" on public.feedback;
create policy "Read own feedback" on public.feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Add own feedback" on public.feedback;
create policy "Add own feedback" on public.feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Anyone signed in can read the shop's updates; only the dashboard can write them.
drop policy if exists "Read the news" on public.news;
create policy "Read the news" on public.news
  for select to authenticated
  using (true);
