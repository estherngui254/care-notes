// @vitest-environment node
//
// Runs the real SQL in supabase/*.sql on a small in-memory Postgres (PGlite), with stand-ins for
// Supabase's sign-in system (the auth schema, auth.uid() and the anon/authenticated roles).
// This is how the privacy rules, the order functions and the status history are tested before
// anyone runs the SQL on the real project.
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { normalizePlants } from '../src/storage.js'
import { CARE_RECOMMENDATIONS } from '../src/careRecommendations.js'
import { PROBLEMS } from '../src/pestsAndDiseases.js'

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
const ordersSql = readFileSync(new URL('./orders.sql', import.meta.url), 'utf8')
const seedSql = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8')
const seedOrdersSql = readFileSync(new URL('./seed-orders.sql', import.meta.url), 'utf8')
const addOrderSql = readFileSync(new URL('./add-order.sql', import.meta.url), 'utf8')
const contactSql = readFileSync(new URL('./contact.sql', import.meta.url), 'utf8')

let db
const ALICE = '11111111-1111-1111-1111-111111111111'
const BOB = '22222222-2222-2222-2222-222222222222'

// Acts as a signed-in person, a signed-out visitor, or the dashboard (full access).
async function as(who, run) {
  if (who === 'dashboard') await db.exec('reset role; select set_config(\'request.jwt.claim.sub\', \'\', false)')
  else if (who === 'anon') await db.exec('set role anon; select set_config(\'request.jwt.claim.sub\', \'\', false)')
  else await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${who}', false)`)
  try {
    return await run()
  } finally {
    await db.exec('reset role')
  }
}

const rows = async (sql, params) => (await db.query(sql, params)).rows
const fails = async (promise, pattern) => {
  const error = await promise.then(() => null, (problem) => problem)
  expect(error, 'expected the statement to fail').not.toBeNull()
  expect(error.message).toMatch(pattern)
}

const items = [
  { id: 'monstera', name: 'Monstera', detail: '18 cm pot', priceKsh: 1600, qty: 1 },
  { id: 'potting-soil', name: 'Potting soil', detail: '5 L bag', priceKsh: 350, qty: 2 },
]
const customer = { name: 'Amina Otieno', phone: '+254712345678', email: 'amina@example.com' }
const address = { area: 'Nairobi CBD, Westlands, Kilimani, Lavington', street: 'Rose Apartments, Kilimani', landmark: 'Opposite the mall' }

function place(overrides = {}) {
  const args = {
    items, fulfilment: 'delivery', customer, address, payment: { method: 'mpesa', reference: 'QGH7ABC123' }, fee: 300, ...overrides,
  }
  return db.query('select * from public.place_order($1::jsonb, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6)', [
    JSON.stringify(args.items), args.fulfilment, JSON.stringify(args.customer),
    args.address === null ? null : JSON.stringify(args.address), JSON.stringify(args.payment), args.fee,
  ])
}

beforeAll(async () => {
  db = new PGlite()
  // Stand-ins for what Supabase provides.
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb, created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com');
  `)
  await db.exec(schemaSql)
  await db.exec(ordersSql)
}, 60_000)

afterAll(async () => {
  await db?.close()
})

describe('the SQL files', () => {
  it('can be run a second time without errors', async () => {
    await db.exec(schemaSql)
    await db.exec(ordersSql)
    expect((await rows("select count(*)::int as n from pg_policies where tablename = 'plants'"))[0].n).toBe(4)
    expect((await rows("select count(*)::int as n from pg_policies where tablename in ('orders', 'order_events')"))[0].n).toBe(2)
  })

  it('turns Row Level Security on for every table', async () => {
    const tables = await rows(`select relname, relrowsecurity from pg_class
      where relname in ('plants', 'orders', 'order_events') and relkind = 'r' order by relname`)
    expect(tables).toEqual([
      { relname: 'order_events', relrowsecurity: true },
      { relname: 'orders', relrowsecurity: true },
      { relname: 'plants', relrowsecurity: true },
    ])
  })
})

describe('plants', () => {
  const plant = (name) => JSON.stringify({ id: name, name })

  it('lets a person save, read, change and delete only their own plants', async () => {
    await as(ALICE, async () => {
      await db.query("insert into public.plants (id, data) values ('p1', $1)", [plant('Fern')])
      await db.query("update public.plants set data = $1 where id = 'p1'", [plant('Boston Fern')])
      expect((await rows('select data from public.plants'))[0].data.name).toBe('Boston Fern')
    })
    await as(BOB, async () => {
      expect(await rows('select * from public.plants')).toEqual([])
      await db.query("update public.plants set data = '{}' where id = 'p1'")
      await db.query("delete from public.plants where id = 'p1'")
    })
    await as(ALICE, async () => {
      expect((await rows('select data from public.plants'))[0].data.name).toBe('Boston Fern')
    })
  })

  it('stamps the row with the signed-in person and refuses someone else\'s name', async () => {
    await as(BOB, async () => {
      await db.query("insert into public.plants (id, data) values ('b1', $1)", [plant('Bob Aloe')])
      expect((await rows("select user_id from public.plants where id = 'b1'"))[0].user_id).toBe(BOB)
      await fails(db.query("insert into public.plants (user_id, id, data) values ($1, 'x', '{}')", [ALICE]), /row-level security/i)
    })
  })

  it('keeps two people\'s plants with the same id apart', async () => {
    await as(ALICE, () => db.query("insert into public.plants (id, data) values ('shared', $1)", [plant('Alice Copy')]))
    await as(BOB, () => db.query("insert into public.plants (id, data) values ('shared', $1)", [plant('Bob Copy')]))
    await as(BOB, async () => expect((await rows("select data from public.plants where id = 'shared'"))[0].data.name).toBe('Bob Copy'))
  })

  it('shows nothing, and allows nothing, to someone who is signed out', async () => {
    await as('anon', async () => {
      await fails(db.query('select * from public.plants'), /permission denied/i)
      await fails(db.query("insert into public.plants (user_id, id, data) values ($1, 'z', '{}')", [ALICE]), /permission denied/i)
    })
  })
})

describe('placing an order', () => {
  it('creates an order with a tracking code, totals and a first history entry', async () => {
    const order = await as(ALICE, async () => (await place()).rows[0])
    expect(order.tracking_code).toMatch(/^PCN-[A-HJ-NP-Z2-9]{6}$/)
    expect(order).toMatchObject({
      status: 'placed', fulfilment: 'delivery', subtotal_ksh: 2300, delivery_fee_ksh: 300, total_ksh: 2600, user_id: ALICE,
    })
    expect(order.items).toHaveLength(2)
    expect(order.address.street).toBe('Rose Apartments, Kilimani')
    expect(order.payment).toEqual({ method: 'mpesa', reference: 'QGH7ABC123' })
    const events = await rows('select status, note from public.order_events where order_id = $1', [order.id])
    expect(events).toEqual([{ status: 'placed', note: 'We received your order' }])
  })

  it('gives every order its own tracking code', async () => {
    const codes = await as(BOB, async () => {
      const made = []
      for (let index = 0; index < 4; index++) made.push((await place()).rows[0].tracking_code)
      return made
    })
    expect(new Set(codes).size).toBe(4)
  })

  it('charges no delivery fee for collection and keeps no address', async () => {
    const order = await as(ALICE, async () => (await place({ fulfilment: 'collection', address: null, fee: 999, payment: { method: 'cash' } })).rows[0])
    expect(order).toMatchObject({ fulfilment: 'collection', delivery_fee_ksh: 0, total_ksh: 2300, address: null })
  })

  it('refuses orders that are not valid', async () => {
    await as(ALICE, async () => {
      await fails(place({ items: [] }), /empty or too large/i)
      await fails(place({ items: [{ id: 'x', name: 'X', priceKsh: 100, qty: 0 }] }), /quantities/i)
      await fails(place({ items: [{ id: 'x', name: 'X', priceKsh: -5, qty: 1 }] }), /prices/i)
      await fails(place({ items: [{ id: 'x', name: 'X', priceKsh: 100, qty: 150 }] }), /quantities/i)
      await fails(place({ items: [{ id: '', name: 'X', priceKsh: 100, qty: 1 }] }), /not valid/i)
      await fails(place({ fulfilment: 'teleport' }), /delivery or collection/i)
      await fails(place({ customer: { name: 'No Phone' } }), /name and phone number/i)
      await fails(place({ address: { area: 'Somewhere' } }), /delivery address/i)
      await fails(place({ payment: { method: 'bitcoin' } }), /how you will pay/i)
      await fails(place({ fee: -1 }), /delivery fee/i)
      await fails(place({ fee: 50000 }), /delivery fee/i)
    })
  })

  it('refuses people who are not signed in', async () => {
    await as('anon', async () => {
      await fails(place(), /permission denied/i)
    })
    await db.exec('reset role')
    await db.exec("select set_config('request.jwt.claim.sub', '', false)")
    await fails(place(), /not signed in/i)
  })

  it('limits how many orders can be waiting for the shop to confirm them', async () => {
    const CARL = '33333333-3333-3333-3333-333333333333'
    await db.query("insert into auth.users (id, email) values ($1, 'carl@example.com')", [CARL])
    await as(CARL, async () => {
      for (let index = 0; index < 5; index++) await place()
      await fails(place(), /already have 5 orders waiting/i)
    })
    await db.query("update public.orders set status = 'confirmed' where user_id = $1 and tracking_code = (select tracking_code from public.orders where user_id = $1 limit 1)", [CARL])
    await as(CARL, async () => {
      expect((await place()).rows).toHaveLength(1)
    })
  })

  it('cannot be edited or created directly by a customer', async () => {
    await as(ALICE, async () => {
      await fails(db.query("update public.orders set status = 'delivered', total_ksh = 1"), /permission denied/i)
      await fails(db.query("delete from public.orders"), /permission denied/i)
      await fails(db.query(`insert into public.orders (tracking_code, fulfilment, items, subtotal_ksh, total_ksh, customer, payment)
        values ('PCN-FAKE22', 'delivery', '[]', 0, 0, '{}', '{}')`), /permission denied/i)
      await fails(db.query("insert into public.order_events (order_id, status) select id, 'delivered' from public.orders limit 1"), /permission denied/i)
    })
  })
})

describe('privacy between customers', () => {
  it('shows each person only their own orders and history', async () => {
    const mine = await as(ALICE, async () => rows('select tracking_code from public.orders'))
    const bobs = await as(BOB, async () => rows('select tracking_code from public.orders'))
    expect(mine.length).toBeGreaterThan(0)
    expect(bobs.length).toBeGreaterThan(0)
    const mineCodes = new Set(mine.map((row) => row.tracking_code))
    expect(bobs.some((row) => mineCodes.has(row.tracking_code))).toBe(false)

    const aliceEvents = await as(ALICE, async () => rows('select o.user_id from public.order_events e join public.orders o on o.id = e.order_id'))
    expect(aliceEvents.every((row) => row.user_id === ALICE)).toBe(true)
    const bobsEventCount = await as(BOB, async () => (await rows('select count(*)::int as n from public.order_events'))[0].n)
    const bobsOrderCount = await as(BOB, async () => (await rows('select count(*)::int as n from public.orders'))[0].n)
    expect(bobsEventCount).toBe(bobsOrderCount) // one "received" entry each, nobody else's
  })

  it('shows nothing to someone who is signed out', async () => {
    await as('anon', async () => {
      await fails(db.query('select * from public.orders'), /permission denied/i)
      await fails(db.query('select * from public.order_events'), /permission denied/i)
    })
  })
})

describe('the shop updating an order from the dashboard', () => {
  let order

  beforeAll(async () => {
    order = await as(ALICE, async () => (await place()).rows[0])
  })

  it('writes every status change into the history, with the shop\'s note', async () => {
    await as('dashboard', async () => {
      await db.query("update public.orders set status = 'confirmed', note = 'Payment received, thank you' where id = $1", [order.id])
      await db.query("update public.orders set status = 'packed', note = 'Packed and ready for the rider' where id = $1", [order.id])
      await db.query(`update public.orders set status = 'out_for_delivery', note = 'On the way',
        rider = '{"name": "Joseph", "phone": "+254700111222", "vehicle": "Motorbike KMEL 123X"}',
        eta = now() + interval '2 hours' where id = $1`, [order.id])
    })
    const history = await as(ALICE, async () => rows('select status, note from public.order_events where order_id = $1 order by id', [order.id]))
    expect(history.map((row) => row.status)).toEqual(['placed', 'confirmed', 'packed', 'out_for_delivery'])
    expect(history.at(-1).note).toBe('On the way')

    const current = await as(ALICE, async () => (await rows('select status, rider, eta from public.orders where id = $1', [order.id]))[0])
    expect(current.status).toBe('out_for_delivery')
    expect(current.rider.name).toBe('Joseph')
    expect(current.eta).toBeTruthy()
  })

  it('does not add history for a change that is not a status or note', async () => {
    const before = (await rows('select count(*)::int as n from public.order_events where order_id = $1', [order.id]))[0].n
    await as('dashboard', () => db.query("update public.orders set eta = now() + interval '3 hours' where id = $1", [order.id]))
    const after = (await rows('select count(*)::int as n from public.order_events where order_id = $1', [order.id]))[0].n
    expect(after).toBe(before)
  })

  it('refreshes updated_at', async () => {
    const [{ created_at: created, updated_at: updated }] = await rows('select created_at, updated_at from public.orders where id = $1', [order.id])
    expect(new Date(updated).getTime()).toBeGreaterThanOrEqual(new Date(created).getTime())
  })

  it('only accepts known statuses', async () => {
    await as('dashboard', async () => {
      await fails(db.query("update public.orders set status = 'lost_in_space' where id = $1", [order.id]), /check constraint/i)
    })
  })
})

describe('cancelling an order', () => {
  it('lets a customer cancel before it is packed, and records it', async () => {
    const order = await as(BOB, async () => (await place()).rows[0])
    const cancelled = await as(BOB, async () => (await db.query('select * from public.cancel_my_order($1)', [order.id])).rows[0])
    expect(cancelled).toMatchObject({ status: 'cancelled', note: 'Cancelled by you' })
    const history = await as(BOB, async () => rows('select status from public.order_events where order_id = $1 order by id', [order.id]))
    expect(history.map((row) => row.status)).toEqual(['placed', 'cancelled'])
  })

  it('refuses once the order is packed or on its way', async () => {
    const order = await as(BOB, async () => (await place()).rows[0])
    await as('dashboard', () => db.query("update public.orders set status = 'packed' where id = $1", [order.id]))
    await as(BOB, async () => {
      await fails(db.query('select * from public.cancel_my_order($1)', [order.id]), /can no longer be cancelled/i)
    })
  })

  it('refuses to cancel someone else\'s order', async () => {
    const order = await as(ALICE, async () => (await place()).rows[0])
    await as(BOB, async () => {
      await fails(db.query('select * from public.cancel_my_order($1)', [order.id]), /can no longer be cancelled/i)
    })
    expect((await rows('select status from public.orders where id = $1', [order.id]))[0].status).toBe('placed')
  })

  it('refuses people who are signed out', async () => {
    await as('anon', async () => {
      await fails(db.query('select * from public.cancel_my_order($1)', ['00000000-0000-0000-0000-000000000000']), /permission denied/i)
    })
  })
})

describe('deleting an account', () => {
  it('removes the person, their plants, their orders and the order history', async () => {
    const DANA = '44444444-4444-4444-4444-444444444444'
    await db.query("insert into auth.users (id, email) values ($1, 'dana@example.com')", [DANA])
    await as(DANA, async () => {
      await db.query("insert into public.plants (id, data) values ('d1', '{}')")
      await place()
    })
    await as(DANA, () => db.query('select public.delete_my_account()'))
    expect((await rows('select count(*)::int as n from auth.users where id = $1', [DANA]))[0].n).toBe(0)
    expect((await rows('select count(*)::int as n from public.plants where user_id = $1', [DANA]))[0].n).toBe(0)
    expect((await rows('select count(*)::int as n from public.orders where user_id = $1', [DANA]))[0].n).toBe(0)
  })

  it('refuses people who are signed out', async () => {
    await as('anon', async () => {
      await fails(db.query('select public.delete_my_account()'), /permission denied/i)
    })
  })
})

describe('the sample data', () => {
  const DEMO = '55555555-5555-5555-5555-555555555555'
  const seedPlants = "select count(*)::int as n from public.plants where id like 'seed-%'"
  const seedOrders = "select count(*)::int as n from public.orders where tracking_code like 'PCN-DM%'"
  const seedEvents =
    'select count(*)::int as n from public.order_events e join public.orders o on o.id = e.order_id '
    + "where o.tracking_code like 'PCN-DM%'"
  const count = async (sql) => (await rows(sql))[0].n

  it('is added to one account, in the shapes the app accepts', async () => {
    await db.query("insert into auth.users (id, email) values ($1, 'demo@example.com')", [DEMO])
    await db.exec(seedSql)
    await db.exec(seedOrdersSql)

    expect(await count(seedPlants)).toBe(10)
    expect(await count(seedOrders)).toBe(5)
    expect(await count(seedEvents)).toBe(17)

    const stored = (await rows('select data from public.plants where user_id = $1', [DEMO])).map((row) => row.data)
    const plants = normalizePlants(stored)
    expect(plants).toHaveLength(10)
    expect(plants.every((plant) => plant.name && plant.careNote)).toBe(true)
    expect(plants.every((plant) => plant.recommendations.every((pick) => CARE_RECOMMENDATIONS.includes(pick)))).toBe(true)

    const issues = plants.flatMap((plant) => plant.issues)
    expect(issues).toHaveLength(5)
    expect(issues.every((issue) => issue.suspected === ''
      || PROBLEMS.some((problem) => problem.name === issue.suspected))).toBe(true)
    expect(issues.every((issue) => {
      const problem = PROBLEMS.find((candidate) => candidate.name === issue.suspected)
      return !problem || issue.stepsDone.every((step) => problem.treatment.includes(step))
    })).toBe(true)
  })

  it('can be run a second time without duplicating anything', async () => {
    await db.exec(seedSql)
    await db.exec(seedOrdersSql)
    expect(await count(seedPlants)).toBe(10)
    expect(await count(seedOrders)).toBe(5)
    expect(await count(seedEvents)).toBe(17)
  })

  it('stays with that account under Row Level Security', async () => {
    expect((await as(DEMO, () => rows(seedPlants)))[0].n).toBe(10)
    expect((await as(DEMO, () => rows(seedOrders)))[0].n).toBe(5)
    expect((await as(ALICE, () => rows(seedPlants)))[0].n).toBe(0)
    expect((await as(ALICE, () => rows(seedOrders)))[0].n).toBe(0)
    expect((await as(ALICE, () => rows(seedEvents)))[0].n).toBe(0)
  })

  it('leaves the shop rules in place', async () => {
    // The history trigger was switched off while the demo rows went in, and is back on now.
    const order = await as(DEMO, async () => (await place()).rows[0])
    expect(order.tracking_code).toMatch(/^PCN-/)
    expect((await rows('select count(*)::int as n from public.order_events where order_id = $1', [order.id]))[0].n).toBe(1)
    // One seeded order is waiting for the shop, so the limit of 5 waiting orders still allows this.
    const waiting = await rows("select count(*)::int as n from public.orders where user_id = $1 and status = 'placed'", [DEMO])
    expect(waiting[0].n).toBe(2)
  })
})

describe('adding an order from the shop', () => {
  const ESTHER = '66666666-6666-6666-6666-666666666666'
  const ORDER = 'f1000000-0000-4000-8000-000000000001'

  it('stops with a clear message when the customer has no account', async () => {
    await fails(db.exec(addOrderSql.replaceAll('esther.ngui254@gmail.com', 'nobody@example.com')), /No account found/i)
  })

  it('adds the collection order to the customer account with its first history entry', async () => {
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'esther.ngui254@gmail.com', $2)", [ESTHER, JSON.stringify({ name: 'Esther Ngui' })])
    await db.exec(addOrderSql)

    const [order] = await rows('select * from public.orders where id = $1', [ORDER])
    expect(order).toMatchObject({
      user_id: ESTHER,
      fulfilment: 'collection',
      status: 'placed',
      subtotal_ksh: 550,
      delivery_fee_ksh: 0,
      total_ksh: 550,
      payment: { method: 'cash' },
      customer: { name: 'Esther Ngui', email: 'esther.ngui254@gmail.com' },
    })
    expect(order.address).toBeNull()
    expect(order.items).toEqual([{ id: 'perlite', name: 'Perlite', detail: '2 L bag, keeps soil airy', priceKsh: 550, qty: 1 }])
    expect(await rows('select status, note from public.order_events where order_id = $1 order by id', [ORDER]))
      .toEqual([{ status: 'placed', note: 'We received your order' }])
  })

  it('runs again without duplicating the order or undoing the shop progress', async () => {
    // The shop confirms it, the way docs/order-management.md describes.
    await as('dashboard', () => db.query("update public.orders set status = 'confirmed', note = 'Paid, thank you' where id = $1", [ORDER]))
    expect((await rows('select count(*)::int as n from public.order_events where order_id = $1', [ORDER]))[0].n).toBe(2)

    await db.exec(addOrderSql)

    expect((await rows('select count(*)::int as n from public.orders where id = $1', [ORDER]))[0].n).toBe(1)
    const [order] = await rows('select status, note from public.orders where id = $1', [ORDER])
    expect(order).toMatchObject({ status: 'confirmed', note: 'Paid, thank you' })
    expect((await rows('select count(*)::int as n from public.order_events where order_id = $1', [ORDER]))[0].n).toBe(2)
  })

  it('is only visible to that customer', async () => {
    expect((await as(ESTHER, () => rows('select count(*)::int as n from public.orders')))[0].n).toBe(1)
    expect((await as(ESTHER, () => rows('select count(*)::int as n from public.order_events')))[0].n).toBe(2)
    expect((await as(ALICE, () => rows('select count(*)::int as n from public.orders where id = $1', [ORDER])))[0].n).toBe(0)
    expect((await as(ALICE, () => rows('select count(*)::int as n from public.order_events where order_id = $1', [ORDER])))[0].n).toBe(0)
  })
})

describe('contact, updates and feedback', () => {
  const NEWS_ID = '99999999-9999-4444-8888-999999999999'

  it('sets up safely, twice, and lets the shop post an update others can read', async () => {
    await db.exec(contactSql)
    await db.exec(contactSql)
    await as('dashboard', () => db.query(
      "insert into public.news (id, title, body) values ($1, 'New arrivals', 'Fresh seedlings and herbs arrive every Saturday morning.')",
      [NEWS_ID],
    ))
    const seen = await as(ALICE, () => rows('select title from public.news'))
    expect(seen.map((row) => row.title)).toEqual(['New arrivals'])
    await fails(as(ALICE, () => db.query("insert into public.news (title, body) values ('Hacked', 'Not allowed from the app.')")), /permission denied/i)
  })

  it('keeps messages and feedback between the writer and the shop', async () => {
    await as(ALICE, () => db.query("insert into public.messages (subject, body) values ($1, $2)", ['Delivery question', 'Can I collect on Sunday morning?']))
    await as(ALICE, () => db.query("insert into public.feedback (kind, rating, body) values ('review', 5, 'The monstera arrived healthy and beautifully packed.')"))

    expect((await as(ALICE, () => rows('select count(*)::int as n from public.messages')))[0].n).toBe(1)
    expect((await as(ALICE, () => rows('select count(*)::int as n from public.feedback')))[0].n).toBe(1)
    expect((await as(BOB, () => rows('select count(*)::int as n from public.messages')))[0].n).toBe(0)
    expect((await as(BOB, () => rows('select count(*)::int as n from public.feedback')))[0].n).toBe(0)

    await fails(as('anon', () => rows('select count(*)::int as n from public.messages')), /permission denied/i)
    await fails(as('anon', () => rows('select count(*)::int as n from public.news')), /permission denied/i)
    await fails(as(ALICE, () => db.query("update public.messages set subject = 'Changed'")), /permission denied/i)
    await fails(as(ALICE, () => db.query('delete from public.feedback')), /permission denied/i)
  })

  it('refuses feedback the app would not accept', async () => {
    await fails(as(ALICE, () => db.query("insert into public.feedback (kind, rating, body) values ('rant', null, 'A kind that does not exist.')")), /kind_check/)
    await fails(as(ALICE, () => db.query("insert into public.feedback (kind, rating, body) values ('review', null, 'A review without any rating.')")), /rating_check/)
    await fails(as(ALICE, () => db.query("insert into public.feedback (kind, rating, body) values ('complaint', 4, 'A complaint should not carry one.')")), /rating_check/)
    await fails(as(ALICE, () => db.query("insert into public.feedback (kind, rating, body) values ('compliment', null, 'Too short')")), /body_check/)
    await fails(as(ALICE, () => db.query("insert into public.messages (subject, body) values ('A fine subject', 'Too short')")), /messages_body_check/)
  })

  it('removes messages and feedback with the account, and keeps the news', async () => {
    const GONE = '88888888-8888-4444-8888-888888888888'
    await db.query("insert into auth.users (id, email) values ($1, 'leaver@example.com')", [GONE])
    await as(GONE, () => db.query("insert into public.messages (subject, body) values ('Bye for now', 'Please remove my details soon.')"))
    await as(GONE, () => db.query("insert into public.feedback (kind, rating, body) values ('compliment', null, 'Lovely shop, thank you for everything.')"))
    await as(GONE, () => db.query('select public.delete_my_account()'))
    expect((await rows('select count(*)::int as n from public.messages where user_id = $1', [GONE]))[0].n).toBe(0)
    expect((await rows('select count(*)::int as n from public.feedback where user_id = $1', [GONE]))[0].n).toBe(0)
    expect((await rows('select count(*)::int as n from public.news'))[0].n).toBe(1)
  })
})
