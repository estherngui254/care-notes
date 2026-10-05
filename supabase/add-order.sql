-- Plant Care Notes: add one order from the shop side (a counter, phone or WhatsApp order).
--
-- Run this in the Supabase SQL Editor after supabase/orders.sql. The order belongs to the
-- customer's account, so it appears under "My orders" for them, and the history trigger adds the
-- first "We received your order" entry by itself. The shop then moves it through the stages from
-- the dashboard as usual (see docs/order-management.md).
--
-- Running this again refreshes this same order instead of making a second one, and does not undo
-- any progress the shop has already made. To add ANOTHER order for the same person later, change
-- both the id and the tracking code below.
--
-- This example: 1 bag of Perlite (KSh 550), collected from the shop, paying at the shop, status
-- "placed". The totals are worked out from the items. Check these before running:
--   * items: change the quantity or price there and the totals follow
--   * phone: leave "" and the Contact section just shows the name
--   * paying by M-PESA: swap the payment line for the M-PESA line underneath it

-- ---------------------------------------------------------------------------------------------------
-- Check the setup is ready and the customer has an account
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.orders') is null then
    raise exception 'The orders tables are missing. Run supabase/orders.sql first, then this file';
  end if;
  if not exists (select 1 from auth.users where lower(email) = 'esther.ngui254@gmail.com') then
    raise exception 'No account found for esther.ngui254@gmail.com. Create the account in the app, or add the user under Authentication -> Users, then run this again';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- The order: collection from the shop, cash ("Pay at the shop"), waiting for the shop to confirm.
-- ---------------------------------------------------------------------------------------------------

insert into public.orders (
  id, user_id, tracking_code, status, fulfilment, items, subtotal_ksh, delivery_fee_ksh, total_ksh,
  customer, address, payment, created_at, updated_at
)
select
  'f1000000-0000-4000-8000-000000000001'::uuid, -- change this to add a further order
  account.id,
  'PCN-ESTH26', -- change this too to add a further order
  'placed',
  'collection',
  given.items,
  money.total, 0, money.total,
  jsonb_build_object(
    'name', coalesce(account.name, 'Esther'),
    'phone', '', -- a real number, e.g. '+254712345678'
    'email', 'esther.ngui254@gmail.com'
  ),
  null::jsonb, -- collection keeps no address
  '{"method": "cash"}'::jsonb, -- M-PESA instead: '{"method": "mpesa", "reference": "XXXXXXXXXX"}'
  now(), now()
from (
  select '[{"id": "perlite", "name": "Perlite", "detail": "2 L bag, keeps soil airy", "priceKsh": 550, "qty": 1}]'::jsonb as items
) given
cross join lateral (
  select coalesce(sum((line ->> 'priceKsh')::bigint * (line ->> 'qty')::int), 0)::int as total
  from jsonb_array_elements(given.items) as line
) money
cross join (
  select id, nullif(raw_user_meta_data ->> 'name', '') as name
  from auth.users
  where lower(email) = 'esther.ngui254@gmail.com'
) account
on conflict (id) do update set
  -- status, note, rider and eta are left alone: once the order is moving they belong to the shop.
  user_id = excluded.user_id,
  tracking_code = excluded.tracking_code,
  fulfilment = excluded.fulfilment,
  items = excluded.items,
  subtotal_ksh = excluded.subtotal_ksh,
  delivery_fee_ksh = excluded.delivery_fee_ksh,
  total_ksh = excluded.total_ksh,
  customer = excluded.customer,
  address = excluded.address,
  payment = excluded.payment,
  updated_at = excluded.updated_at;
