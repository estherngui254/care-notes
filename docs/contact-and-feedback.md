# Contact, updates and feedback

The **Contact** section of the app (set up by `supabase/contact.sql`) has three parts:

| What the customer does | Table | Who can read it | Who can write it |
|---|---|---|---|
| Reads the shop's updates | `news` | Everyone signed in | Only the Supabase dashboard |
| Writes a message to the shop | `messages` | The writer, and the dashboard | The writer (from the app), the dashboard |
| Reads the shop's replies to their messages | `message_replies` | The writer, and the dashboard | Only the Supabase dashboard |
| Leaves a review, complaint or compliment | `feedback` | The writer, and the dashboard | The writer (from the app), the dashboard |

Nothing a customer writes is shown to any other customer: Row Level Security keeps each person's
rows to themselves, and only your Supabase dashboard sees everything.

## One-time setup

Run `supabase/contact.sql` in the Supabase SQL Editor, after `supabase/schema.sql`. Until then the
Contact section says it is not set up and nothing is sent.

## Reading messages and feedback

**Table Editor → messages / feedback**, newest rows first. Or from the SQL Editor, with the
account's email next to each entry:

```sql
select u.email, m.created_at, m.subject, m.body
from public.messages m
join auth.users u on u.id = m.user_id
order by m.created_at desc;

select u.email, f.created_at, f.kind, f.rating, f.body
from public.feedback f
join auth.users u on u.id = f.user_id
order by f.created_at desc;
```

There is no "mark as read" and customers cannot edit or delete what they sent, so the tables are a
faithful record. Deleting an entry = deleting its row here. Deleting the account (**Delete
account** in the app) removes that person's messages and feedback with it.

## Replying to a customer

Only the shop can reply, and only the customer the message belongs to can read the reply.
**Table Editor → message_replies → Insert row**: `message_id` (copy it from the `messages` table)
and `body`. Or from the SQL Editor:

```sql
insert into public.message_replies (message_id, body)
select id, 'Hello, yes we are open on Sundays until 4 pm.'
from public.messages
where subject = 'Delivery question';
```

The customer sees the reply under their own message when they open **Contact**, or after pressing
**Check for replies**. Deleting a message in the dashboard deletes its replies with it.

## Posting an update (the news board)

Customers read updates under **Contact**, newest first. The app cannot write them — you post them
from the dashboard: **Table Editor → news → Insert row**, or in the SQL Editor:

```sql
insert into public.news (title, body)
values ('Saturday seedlings', 'Fresh herb and vegetable seedlings arrive every Saturday morning.');
```

To take one down or correct it, edit or delete the row in the dashboard; customers see the change
at once.

## Length limits (checked by the database, and by the form)

- subject and title: 3 to 120 characters
- message, feedback and update bodies: 10 to 3000 characters
- feedback `kind`: `review`, `complaint` or `compliment` — reviews carry a rating from 1 to 5,
  the other two carry none
