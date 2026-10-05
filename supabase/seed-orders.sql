-- Plant Care Notes: sample shop orders to try order tracking with.
--
-- Run this after supabase/schema.sql and supabase/orders.sql: Supabase dashboard -> SQL Editor ->
-- New query -> paste -> Run. It is safe to run again; it puts the five demo orders and their
-- histories back exactly as written below and touches nothing else.
--
-- Where the data goes: the account demo@example.com if that account exists, otherwise the earliest
-- account in the project (the same rule as supabase/seed.sql). The tracking codes start with
-- "PCN-DM", so the demo orders are easy to spot and remove.
--
-- The five orders cover every end of the shop flow: one delivered, one collected, one out for
-- delivery with a rider, one waiting for the shop to confirm, and one cancelled. Only one is still
-- waiting, so the limit of 5 waiting orders does not get in the way of placing a real one.

-- ---------------------------------------------------------------------------------------------------
-- Check the setup is ready
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.orders') is null then
    raise exception 'The orders tables are missing. Run supabase/schema.sql and then supabase/orders.sql first, then this file';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.orders'::regclass
      and tgname in ('orders_log', 'orders_touch')
      and not tgisinternal
  ) then
    raise exception 'The order triggers are missing. Run supabase/orders.sql again, then this file';
  end if;
  if not exists (select 1 from auth.users) then
    raise exception 'There is no account yet. Register in the app (for example demo@example.com), confirm the address, then run this file again';
  end if;
end $$;

-- The two automatic triggers are switched off while the demo rows go in, so the history below is
-- written with its own dates instead of the moment this file runs. They are switched back on at the
-- end, and the test in supabase/sql.test.js checks that they are.

alter table public.orders disable trigger orders_log;
alter table public.orders disable trigger orders_touch;

-- Clear the previous demo history so a second run does not duplicate it.
delete from public.order_events
where order_id in (
  'e1000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000003',
  'e1000000-0000-4000-8000-000000000004',
  'e1000000-0000-4000-8000-000000000005'
);

-- ---------------------------------------------------------------------------------------------------
-- Five orders. Items, prices, delivery zones and fees match src/shopItems.js.
-- ---------------------------------------------------------------------------------------------------

insert into public.orders (
  id, user_id, tracking_code, status, fulfilment, items, subtotal_ksh, delivery_fee_ksh, total_ksh,
  customer, address, payment, rider, eta, note, created_at, updated_at
)
select o.id, account.id, o.tracking_code, o.status, o.fulfilment, o.items, o.subtotal_ksh,
       o.delivery_fee_ksh, o.total_ksh, o.customer, o.address, o.payment, o.rider, o.eta,
       o.note, o.created_at, o.updated_at
from (
  values
    ('e1000000-0000-4000-8000-000000000001'::uuid, 'PCN-DM24AB', 'delivered', 'delivery',
     '[{"id": "monstera", "name": "Monstera", "detail": "18 cm pot, about 60 cm tall", "priceKsh": 1600, "qty": 1}, {"id": "potting-soil", "name": "Potting soil", "detail": "5 L bag, free-draining mix", "priceKsh": 350, "qty": 2}]'::jsonb,
     2300, 300, 2600,
     '{"name": "Amina Otieno", "phone": "+254712345678", "email": ""}'::jsonb,
     '{"area": "Nairobi CBD, Westlands, Kilimani, Lavington", "street": "Rose Apartments, Kilimani", "landmark": "Opposite the mall", "notes": "Call at the gate"}'::jsonb,
     '{"method": "mpesa", "reference": "QGH7ABC123"}'::jsonb,
     null::jsonb, null::timestamptz, 'Delivered to the gate. Thank you for your order',
     '2026-09-20T09:05:00Z'::timestamptz, '2026-09-20T15:40:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000002'::uuid, 'PCN-DM24CD', 'collected', 'collection',
     '[{"id": "snake-plant", "name": "Snake Plant", "detail": "15 cm pot, about 40 cm tall", "priceKsh": 850, "qty": 2}, {"id": "terracotta-pot", "name": "Terracotta pot", "detail": "20 cm, classic clay", "priceKsh": 650, "qty": 1}]'::jsonb,
     2350, 0, 2350,
     '{"name": "Brian Kariuki", "phone": "+254722111222", "email": ""}'::jsonb,
     null::jsonb,
     '{"method": "cash"}'::jsonb,
     null::jsonb, null::timestamptz, null::text,
     '2026-09-25T08:30:00Z'::timestamptz, '2026-09-26T11:00:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000003'::uuid, 'PCN-DM24EF', 'out_for_delivery', 'delivery',
     '[{"id": "areca-palm", "name": "Areca Palm", "detail": "20 cm pot, about 80 cm tall", "priceKsh": 1200, "qty": 1}, {"id": "peace-lily", "name": "Peace Lily", "detail": "16 cm pot, in bloom", "priceKsh": 950, "qty": 1}]'::jsonb,
     2150, 450, 2600,
     '{"name": "Amina Otieno", "phone": "+254712345678", "email": ""}'::jsonb,
     '{"area": "Other parts of Nairobi", "street": "Ruaka Road, Limuru", "landmark": "Near the junction", "notes": ""}'::jsonb,
     '{"method": "mpesa", "reference": "XPL4KHT8N2"}'::jsonb,
     '{"name": "Joseph Mwangi", "phone": "+254733555666", "vehicle": "Boda KDG 431C"}'::jsonb,
     null::timestamptz, 'Joseph is on the way',
     '2026-10-04T14:20:00Z'::timestamptz, '2026-10-04T16:40:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000004'::uuid, 'PCN-DM24GH', 'placed', 'delivery',
     '[{"id": "golden-pothos", "name": "Golden Pothos", "detail": "12 cm hanging pot, trailing", "priceKsh": 600, "qty": 1}, {"id": "perlite", "name": "Perlite", "detail": "2 L bag, keeps soil airy", "priceKsh": 550, "qty": 1}]'::jsonb,
     1150, 300, 1450,
     '{"name": "Amina Otieno", "phone": "+254712345678", "email": ""}'::jsonb,
     '{"area": "Nairobi CBD, Westlands, Kilimani, Lavington", "street": "Rose Apartments, Kilimani", "landmark": "Opposite the mall", "notes": ""}'::jsonb,
     '{"method": "mpesa", "reference": ""}'::jsonb,
     null::jsonb, null::timestamptz, null::text,
     '2026-10-05T05:15:00Z'::timestamptz, '2026-10-05T05:15:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000005'::uuid, 'PCN-DM24JK', 'cancelled', 'delivery',
     '[{"id": "moth-orchid", "name": "Moth Orchid", "detail": "Double stem, 15 cm pot", "priceKsh": 1800, "qty": 1}, {"id": "ceramic-planter", "name": "Ceramic planter", "detail": "18 cm, glazed finish", "priceKsh": 950, "qty": 1}]'::jsonb,
     2750, 300, 3050,
     '{"name": "Grace Wanjiku", "phone": "+254700111222", "email": ""}'::jsonb,
     '{"area": "Nairobi CBD, Westlands, Kilimani, Lavington", "street": "Green Acres, Lavington", "landmark": "", "notes": ""}'::jsonb,
     '{"method": "cash"}'::jsonb,
     null::jsonb, null::timestamptz, 'Cancelled by you',
     '2026-09-28T10:00:00Z'::timestamptz, '2026-09-28T10:47:00Z'::timestamptz)
) as o (id, tracking_code, status, fulfilment, items, subtotal_ksh, delivery_fee_ksh, total_ksh,
        customer, address, payment, rider, eta, note, created_at, updated_at)
-- The account the demo data belongs to: demo@example.com if it exists, otherwise the earliest one.
cross join (
  select coalesce(
    (select id from auth.users where lower(email) = 'demo@example.com'),
    (select id from auth.users order by created_at asc, id asc limit 1)
  ) as id
) account
on conflict (id) do update set
  user_id = excluded.user_id,
  tracking_code = excluded.tracking_code,
  status = excluded.status,
  fulfilment = excluded.fulfilment,
  items = excluded.items,
  subtotal_ksh = excluded.subtotal_ksh,
  delivery_fee_ksh = excluded.delivery_fee_ksh,
  total_ksh = excluded.total_ksh,
  customer = excluded.customer,
  address = excluded.address,
  payment = excluded.payment,
  rider = excluded.rider,
  eta = excluded.eta,
  note = excluded.note,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

-- The two orders that stay live in a demo keep moving with time: the one on its way arrives two
-- hours from now, and the one waiting for the shop was placed three hours ago.

update public.orders
   set eta = now() + interval '2 hours', updated_at = now()
 where id = 'e1000000-0000-4000-8000-000000000003';

update public.orders
   set created_at = now() - interval '3 hours', updated_at = now() - interval '3 hours'
 where id = 'e1000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------------------------------------
-- The status history the tracker shows. Dates match when each stage happened.
-- ---------------------------------------------------------------------------------------------------

insert into public.order_events (order_id, status, note, created_at)
select e.order_id, e.status, e.note, e.created_at
from (
  values
    ('e1000000-0000-4000-8000-000000000001'::uuid, 'placed', 'We received your order', '2026-09-20T09:05:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000001'::uuid, 'confirmed', 'Confirmed and being prepared', '2026-09-20T09:40:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000001'::uuid, 'packed', 'Packed and ready for the rider', '2026-09-20T11:15:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000001'::uuid, 'out_for_delivery', 'Joseph Mwangi is on the way', '2026-09-20T12:05:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000001'::uuid, 'delivered', 'Delivered to the gate. Thank you for your order', '2026-09-20T15:40:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000002'::uuid, 'placed', 'We received your order', '2026-09-25T08:30:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000002'::uuid, 'confirmed', 'Confirmed and being prepared', '2026-09-25T09:10:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000002'::uuid, 'packed', 'Packed and ready for collection', '2026-09-25T10:40:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000002'::uuid, 'ready_for_collection', 'Ready for collection at the shop', '2026-09-25T10:45:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000002'::uuid, 'collected', 'Collected. Thank you for your order', '2026-09-26T11:00:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000003'::uuid, 'placed', 'We received your order', '2026-10-04T14:20:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000003'::uuid, 'confirmed', 'Confirmed and being prepared', '2026-10-04T14:35:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000003'::uuid, 'packed', 'Packed and ready for the rider', '2026-10-04T15:50:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000003'::uuid, 'out_for_delivery', 'Joseph Mwangi is on the way', '2026-10-04T16:40:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000004'::uuid, 'placed', 'We received your order', '2026-10-05T05:15:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000005'::uuid, 'placed', 'We received your order', '2026-09-28T10:00:00Z'::timestamptz),
    ('e1000000-0000-4000-8000-000000000005'::uuid, 'cancelled', 'Cancelled by you', '2026-09-28T10:47:00Z'::timestamptz)
) as e (order_id, status, note, created_at);

-- Keep the history of the order that was placed three hours ago in step with its created_at.
update public.order_events
   set created_at = now() - interval '3 hours'
 where order_id = 'e1000000-0000-4000-8000-000000000004'
   and status = 'placed';

-- Switch the automatic history and timestamps back on for real orders.
alter table public.orders enable trigger orders_log;
alter table public.orders enable trigger orders_touch;
