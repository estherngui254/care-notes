# Managing orders (for the shop)

Customers place orders in the app and follow them under **My orders**. The shop moves each order along from the
Supabase dashboard. There is no staff screen in the app, and customers cannot change an order's status, rider
or price. Only someone signed in to your Supabase dashboard can.

## One-time setup

1. Run `supabase/schema.sql`, then `supabase/orders.sql`, in the Supabase **SQL Editor**.
2. Replace the sample values in `src/shopItems.js`: the M-PESA till number, the delivery areas and fees, and the
   shop address and opening hours for collection.

## Where to see orders

Supabase dashboard → **Table Editor** → **orders**. Each row is one order. The useful columns:

| Column | What it holds |
|--------|---------------|
| `tracking_code` | The code the customer sees, like `PCN-K7M2XQ` |
| `status` | Where the order is (see below) |
| `fulfilment` | `delivery` or `collection` |
| `items` | What was ordered: name, price and quantity |
| `total_ksh` | Items plus delivery fee, in shillings |
| `customer` | Name, phone and email |
| `address` | Delivery area, street, landmark and notes |
| `payment` | `{"method": "mpesa", "reference": "QGH7ABC123"}` or `{"method": "cash"}` |
| `rider`, `eta`, `note` | What you fill in so the customer can see it |

Orders waiting for you, oldest first (SQL Editor):

```sql
select tracking_code, status, total_ksh, customer ->> 'name' as name, customer ->> 'phone' as phone,
       payment ->> 'method' as paying_by, payment ->> 'reference' as mpesa_code, created_at
from public.orders
where status in ('placed', 'confirmed', 'packed', 'out_for_delivery', 'ready_for_collection')
order by created_at;
```

## Check the money before you confirm

The prices and delivery fee in an order come from the customer's browser. The database checks that they are
sensible numbers, but it does not know your real prices. Before confirming an order:

- Compare `total_ksh` with what you would charge for the `items` and the delivery area.
- For M-PESA, find the customer's `reference` code on your till statement and check the amount.
- Cancel the order, or call the customer, if something does not match.

## The stages

Change `status` to move an order. Every change is recorded in the order's history automatically, together with
the `note` you set at the same time, and the customer sees it on their tracker. Stages you skip still show as
passed.

| `status` | When to use it | The customer sees |
|----------|----------------|-------------------|
| `placed` | Set automatically when the order arrives | Order placed |
| `confirmed` | You have checked the order and payment | Confirmed |
| `packed` | The order is boxed and waiting for the rider | Packed |
| `out_for_delivery` | The rider has left | Out for delivery, with the rider's name, a call button and the arrival time |
| `delivered` | The customer has received it | Delivered |
| `ready_for_collection` | Collection orders: ready at the counter | Ready for collection |
| `collected` | Collection orders: handed over | Collected |
| `cancelled` | You cancel it (customers can cancel their own until it is packed) | Cancelled, with your note |

Replace `PCN-K7M2XQ` with the real tracking code in these examples. Run them in the **SQL Editor**, or edit the
cells in the Table Editor.

```sql
-- 1. Confirm
update public.orders
   set status = 'confirmed', note = 'Payment received, thank you'
 where tracking_code = 'PCN-K7M2XQ';

-- 2. Packed
update public.orders
   set status = 'packed', note = 'Packed and ready for the rider'
 where tracking_code = 'PCN-K7M2XQ';

-- 3. Out for delivery, with the rider and an estimated arrival time
update public.orders
   set status = 'out_for_delivery',
       note   = 'Joseph left the shop a few minutes ago',
       rider  = '{"name": "Joseph Kamau", "phone": "+254700111222", "vehicle": "Motorbike KMEL 123X"}',
       eta    = now() + interval '90 minutes'
 where tracking_code = 'PCN-K7M2XQ';

-- 4. Delivered
update public.orders
   set status = 'delivered', note = 'Delivered to the front desk'
 where tracking_code = 'PCN-K7M2XQ';
```

For collection orders use `ready_for_collection` (note: "Ready at the counter") and then `collected`.

To give a new arrival time while the order is on its way, update only `eta`. That does not add a history entry,
but the customer sees the new time the next time their page checks.

To cancel an order yourself:

```sql
update public.orders
   set status = 'cancelled', note = 'Out of stock. We will refund your M-PESA payment'
 where tracking_code = 'PCN-K7M2XQ';
```

## How quickly customers see changes

While an order is on its way, the customer's page checks for updates every 30 seconds, and again when they switch
back to the tab. They can also press **Check for updates**. Orders that are finished are not checked again.

## Looking after customer details

Orders hold names, phone numbers and addresses. Only give dashboard access to people who need it, and delete
orders you no longer need. Deleting an account in the app removes that person's orders too.
