-- Plant Care Notes: which shop items the shop has flagged as out of stock.
--
-- Run this once after supabase/orders.sql: Supabase dashboard -> SQL Editor -> New query -> paste
-- -> Run. It is safe to run again; it only creates what is missing and refreshes the rules.
--
-- How it works:
--   * An item with NO row in this table is in stock, so the table can stay empty until the shop has
--     something to flag. Nothing has to be listed to start selling.
--   * item_id is the id of the item in src/shopItems.js: 'monstera', 'snake-plant', 'peace-lily',
--     'perlite', 'terracotta-pot' and so on (the same ids the app sends with an order).
--   * in_stock is what the shop sets. Set it to false and the app shows the item as "Out of stock",
--     stops the Add to basket button, and refuses checkout while it is in the basket. Set it back to
--     true (or delete the row) when it is available again.
--   * note is optional and shown next to the flag, e.g. 'Back on Friday'.
--
-- Nobody can write to this table from the app: the shop updates it in the dashboard
-- (Table Editor -> shop_stock), like an order's status. See docs/order-management.md for a
-- ready-to-copy query.

-- ---------------------------------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------------------------------

create table if not exists public.shop_stock (
  item_id    text        primary key check (char_length(item_id) between 1 and 60),
  in_stock   boolean     not null default true,
  note       text        check (note is null or char_length(note) <= 120),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------------
-- Privacy rules (Row Level Security)
-- ---------------------------------------------------------------------------------------------------

alter table public.shop_stock enable row level security;

revoke all on table public.shop_stock from anon, authenticated;
grant select on table public.shop_stock to authenticated;

-- Everyone signed in can see what is available; only the dashboard can change it.
drop policy if exists "Read the shop stock" on public.shop_stock;
create policy "Read the shop stock" on public.shop_stock
  for select to authenticated
  using (true);
