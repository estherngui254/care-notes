-- Plant Care Notes: orders and delivery tracking for the plant shop.
--
-- Run this once, after supabase/schema.sql: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it only creates what is missing and refreshes the rules.
--
-- How it works
--   * A customer places an order through place_order(). They cannot insert or edit order rows directly,
--     so nobody can change an order's status, rider or price from the website.
--   * The shop updates an order from the Supabase dashboard (Table Editor -> orders, or the SQL Editor).
--     See docs/order-management.md. Every status change is written to order_events automatically, and
--     that history is what the customer sees on the tracking page.
--   * A customer can only read their own orders, and can only cancel one that is not yet packed.

-- ---------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------

create table if not exists public.orders (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tracking_code    text        not null unique,
  status           text        not null default 'placed'
                     check (status in ('placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered',
                                       'ready_for_collection', 'collected', 'cancelled')),
  fulfilment       text        not null check (fulfilment in ('delivery', 'collection')),
  items            jsonb       not null,
  subtotal_ksh     integer     not null check (subtotal_ksh >= 0),
  delivery_fee_ksh integer     not null default 0 check (delivery_fee_ksh >= 0),
  total_ksh        integer     not null check (total_ksh >= 0),
  customer         jsonb       not null,
  address          jsonb,
  payment          jsonb       not null,
  rider            jsonb,                 -- set by the shop: {"name": "...", "phone": "...", "vehicle": "..."}
  eta              timestamptz,           -- set by the shop: estimated arrival
  note             text,                  -- set by the shop: a message shown to the customer
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_user_created on public.orders (user_id, created_at desc);

create table if not exists public.order_events (
  id         bigint      generated always as identity primary key,
  order_id   uuid        not null references public.orders (id) on delete cascade,
  status     text        not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------------------------------------
-- Privacy rules (Row Level Security)
-- ---------------------------------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_events enable row level security;

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_events from anon, authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_events to authenticated;

drop policy if exists "Read own orders" on public.orders;
create policy "Read own orders" on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Read own order events" on public.order_events;
create policy "Read own order events" on public.order_events
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_events.order_id and o.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------------------------------
-- Automatic history and timestamps
-- ---------------------------------------------------------------------------------------------------

create or replace function public.orders_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.orders_touch_updated_at();

create or replace function public.orders_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, status, note) values (new.id, new.status, 'We received your order');
  elsif new.status is distinct from old.status or new.note is distinct from old.note then
    insert into public.order_events (order_id, status, note) values (new.id, new.status, new.note);
  end if;
  return null;
end;
$$;

drop trigger if exists orders_log on public.orders;
create trigger orders_log
  after insert or update on public.orders
  for each row execute function public.orders_log_event();

-- ---------------------------------------------------------------------------------------------------
-- Placing and cancelling an order (the only ways a customer can write to orders)
-- ---------------------------------------------------------------------------------------------------

create or replace function public.place_order(
  p_items        jsonb,
  p_fulfilment   text,
  p_customer     jsonb,
  p_address      jsonb,
  p_payment      jsonb,
  p_delivery_fee integer default 0
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_item     jsonb;
  v_subtotal bigint := 0;
  v_waiting  integer;
  v_code     text;
  v_tries    integer := 0;
  v_order    public.orders;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Your basket is empty or too large';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'id', '') = '' or coalesce(v_item ->> 'name', '') = '' then
      raise exception 'One of the items is not valid';
    end if;
    if coalesce(v_item ->> 'qty', '') !~ '^[0-9]{1,2}$' or (v_item ->> 'qty')::int < 1 then
      raise exception 'One of the quantities is not valid';
    end if;
    if coalesce(v_item ->> 'priceKsh', '') !~ '^[0-9]{1,7}$' then
      raise exception 'One of the prices is not valid';
    end if;
    v_subtotal := v_subtotal + (v_item ->> 'qty')::int * (v_item ->> 'priceKsh')::int;
  end loop;

  if p_fulfilment is null or p_fulfilment not in ('delivery', 'collection') then
    raise exception 'Choose delivery or collection';
  end if;
  if coalesce(p_customer ->> 'name', '') = '' or coalesce(p_customer ->> 'phone', '') = '' then
    raise exception 'A name and phone number are required';
  end if;
  if p_fulfilment = 'delivery'
     and (coalesce(p_address ->> 'area', '') = '' or coalesce(p_address ->> 'street', '') = '') then
    raise exception 'A delivery address is required';
  end if;
  if coalesce(p_payment ->> 'method', '') not in ('mpesa', 'cash') then
    raise exception 'Choose how you will pay';
  end if;
  if p_delivery_fee is null or p_delivery_fee < 0 or p_delivery_fee > 10000 then
    raise exception 'The delivery fee is not valid';
  end if;
  if p_fulfilment = 'collection' then
    p_delivery_fee := 0;
  end if;

  -- A simple guard against spam: only a few orders may wait for the shop to confirm them.
  select count(*) into v_waiting from public.orders where user_id = v_user and status = 'placed';
  if v_waiting >= 5 then
    raise exception 'You already have 5 orders waiting to be confirmed. Please wait for the shop to confirm them';
  end if;

  loop
    v_code := 'PCN-' || (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.orders where tracking_code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 20 then
      raise exception 'Could not make a tracking code. Please try again';
    end if;
  end loop;

  insert into public.orders (
    user_id, tracking_code, fulfilment, items, subtotal_ksh, delivery_fee_ksh, total_ksh, customer, address, payment
  ) values (
    v_user, v_code, p_fulfilment, p_items, v_subtotal, p_delivery_fee, v_subtotal + p_delivery_fee,
    p_customer, case when p_fulfilment = 'delivery' then p_address else null end, p_payment
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.place_order(jsonb, text, jsonb, jsonb, jsonb, integer) from public, anon;
grant execute on function public.place_order(jsonb, text, jsonb, jsonb, jsonb, integer) to authenticated;

create or replace function public.cancel_my_order(p_order uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update public.orders
     set status = 'cancelled', note = 'Cancelled by you'
   where id = p_order and user_id = auth.uid() and status in ('placed', 'confirmed')
  returning * into v_order;

  if not found then
    raise exception 'This order can no longer be cancelled. Please call the shop';
  end if;

  return v_order;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;
