import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { DELIVERY_ZONES, MPESA } from './shopItems.js'
import { fakeSupabase } from './test/fakeSupabase.js'

const setup = () => ({ user: userEvent.setup({ applyAccept: false }), ...render(<App />) })
const me = () => fakeSupabase.state.users[0]
const myOrders = () => fakeSupabase.ordersFor(me().id)
const zone = DELIVERY_ZONES[0]
const checkout = () => within(screen.getByRole('form', { name: 'Checkout' }))
const orderCard = (code) => within(screen.getByRole('listitem', { name: `Order ${code}` }))

async function seedOrder({ fulfilment = 'delivery', payment = { method: 'cash' }, fee = zone.feeKsh, items } = {}) {
  const lines = items ?? [{ id: 'monstera', name: 'Monstera', detail: '18 cm pot', priceKsh: 1600, qty: 1 }]
  const { data, error } = await fakeSupabase.client.rpc('place_order', {
    p_items: lines,
    p_fulfilment: fulfilment,
    p_customer: { name: 'Test User', phone: '+254712345678', email: 'test@example.com' },
    p_address: fulfilment === 'delivery' ? { area: zone.label, street: 'Rose Apartments, Kilimani', landmark: '', notes: '' } : null,
    p_payment: payment,
    p_delivery_fee: fee,
  })
  if (error) throw new Error(error.message)
  return data
}

async function addToBasket(user, ...names) {
  for (const name of names) await user.click(screen.getByRole('button', { name: `Add ${name} to basket` }))
}

async function openCheckout(user, ...names) {
  await addToBasket(user, ...names)
  await user.click(screen.getByRole('button', { name: 'Checkout' }))
}

async function fillDelivery(user, { phone = '0712 345 678', street = 'Rose Apartments, Kilimani', code = '' } = {}) {
  await user.type(checkout().getByLabelText('Phone number'), phone)
  await user.selectOptions(checkout().getByLabelText('Delivery area'), zone.id)
  await user.type(checkout().getByLabelText('Street, building or estate and house number'), street)
  if (code) await user.type(checkout().getByLabelText(/M-PESA confirmation code/), code)
}

describe('checkout', () => {
  it('opens a form that is filled in from the account, with the order summary', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera', 'Terracotta pot')
    expect(checkout().getByLabelText('Full name')).toHaveValue('Test User')
    expect(checkout().getByLabelText(/Email/)).toHaveValue('test@example.com')
    expect(checkout().getByLabelText('Delivery to my address')).toBeChecked()
    const summary = checkout().getByRole('group', { name: 'Order summary' })
    expect(summary).toHaveTextContent('1 × Monstera')
    expect(summary).toHaveTextContent('KSh 1,600')
    expect(summary).toHaveTextContent('Choose an area')
  })

  it('adds the delivery fee for the chosen area, and none for collection', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera')
    await user.selectOptions(checkout().getByLabelText('Delivery area'), zone.id)
    const summary = checkout().getByRole('group', { name: 'Order summary' })
    expect(summary).toHaveTextContent(`KSh ${zone.feeKsh}`)
    expect(summary).toHaveTextContent(`KSh ${1600 + zone.feeKsh}`.replace(/(\d)(\d{3})$/, '$1,$2'))

    await user.click(checkout().getByLabelText('I will collect from the shop'))
    expect(summary).toHaveTextContent('Free')
    expect(checkout().queryByLabelText('Delivery area')).not.toBeInTheDocument()
    expect(document.querySelector('.collection-info')).toHaveTextContent(/collect from/i)
  })

  it('explains each problem and sends nothing when the form is not complete', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera')
    await user.clear(checkout().getByLabelText('Full name'))
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(checkout().getByText('Enter your name.')).toBeInTheDocument()
    expect(checkout().getByText(/enter a phone number/i)).toBeInTheDocument()
    expect(checkout().getByText('Choose where we should deliver.')).toBeInTheDocument()
    expect(checkout().getByText(/enter the street, building or estate/i)).toBeInTheDocument()
    expect(checkout().getByLabelText('Full name')).toHaveFocus()

    await user.type(checkout().getByLabelText('Full name'), 'Amina')
    await user.type(checkout().getByLabelText('Phone number'), '12345')
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(checkout().getByText(/kenyan mobile number/i)).toBeInTheDocument()
    expect(checkout().getByLabelText('Phone number')).toHaveAttribute('aria-invalid', 'true')
    expect(fakeSupabase.state.calls.some(([operation, name]) => operation === 'rpc' && name === 'place_order')).toBe(false)
    expect(myOrders()).toEqual([])
  })

  it('rejects an M-PESA code that is not 10 letters and numbers', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera')
    await fillDelivery(user, { code: 'SHORT' })
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(checkout().getByText(/10 letters and numbers/i)).toBeInTheDocument()
    expect(myOrders()).toEqual([])
  })

  it('shows the till number and a cash option', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera')
    expect(checkout().getByText(MPESA.till, { selector: 'strong' })).toBeInTheDocument()
    await user.click(checkout().getByLabelText('Cash on delivery'))
    expect(checkout().queryByLabelText(/M-PESA confirmation code/)).not.toBeInTheDocument()
    expect(checkout().getByText(/in cash when the rider arrives/i)).toBeInTheDocument()
  })
})

describe('placing an order', () => {
  it('saves a delivery order, gives a tracking code and shows it under My orders', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera', 'Terracotta pot')
    await fillDelivery(user, { code: 'qgh7abc123' })
    await user.click(checkout().getByRole('button', { name: 'Place order' }))

    const confirmation = await screen.findByRole('status', { name: 'Order placed' })
    const [order] = myOrders()
    expect(order).toMatchObject({
      status: 'placed', fulfilment: 'delivery', subtotal_ksh: 1600 + 650, delivery_fee_ksh: zone.feeKsh, total_ksh: 1600 + 650 + zone.feeKsh,
      customer: { name: 'Test User', phone: '+254712345678' }, payment: { method: 'mpesa', reference: 'QGH7ABC123' },
    })
    expect(order.address).toMatchObject({ area: zone.label, street: 'Rose Apartments, Kilimani' })
    expect(order.user_id).toBe(me().id)
    expect(confirmation).toHaveTextContent(order.tracking_code)
    expect(confirmation).toHaveTextContent('QGH7ABC123')
    expect(within(confirmation).getByRole('link', { name: 'Track this order' })).toHaveAttribute('href', '#orders')
    expect(screen.queryByRole('region', { name: /your basket/i })).not.toBeInTheDocument()

    const card = orderCard(order.tracking_code)
    expect(card.getByText('Order placed', { selector: '.order-badge' })).toBeInTheDocument()
    expect(card.getByRole('list', { name: `Progress of order ${order.tracking_code}` })).toBeInTheDocument()
  })

  it('saves a collection order paid in cash, with no address and no fee', async () => {
    const { user } = setup()
    await openCheckout(user, 'Calathea')
    await user.click(checkout().getByLabelText('I will collect from the shop'))
    await user.type(checkout().getByLabelText('Phone number'), '+254 712 345 678')
    await user.click(checkout().getByLabelText('Pay at the shop'))
    await user.click(checkout().getByRole('button', { name: 'Place order' }))

    const confirmation = await screen.findByRole('status', { name: 'Order placed' })
    expect(confirmation).toHaveTextContent('You will collect from the shop')
    expect(confirmation).toHaveTextContent('pay in cash at the shop')
    const [order] = myOrders()
    expect(order).toMatchObject({ fulfilment: 'collection', delivery_fee_ksh: 0, total_ksh: 750, address: null, payment: { method: 'cash' } })
    const steps = within(orderCard(order.tracking_code).getByRole('list', { name: /progress of order/i })).getAllByRole('listitem')
    expect(steps.map((step) => step.querySelector('.tracker-label').textContent)).toEqual(['Order placed', 'Confirmed', 'Ready for collection', 'Collected'])
  })

  it('keeps the basket and says why when the shop refuses the order', async () => {
    for (let index = 0; index < 5; index++) await seedOrder()
    const { user } = setup()
    await openCheckout(user, 'Monstera')
    await fillDelivery(user)
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(await checkout().findByText(/you already have 5 orders waiting to be confirmed/i)).toBeInTheDocument()
    expect(myOrders()).toHaveLength(5)
    expect(screen.getByRole('form', { name: 'Checkout' })).toBeInTheDocument()
  })

  it('keeps the basket and explains when there is no connection', async () => {
    const { user } = setup()
    await openCheckout(user, 'Monstera')
    await fillDelivery(user)
    fakeSupabase.state.offline = true
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(await checkout().findByText(/offline or the server could not be reached/i)).toBeInTheDocument()
    fakeSupabase.state.offline = false
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(await screen.findByRole('status', { name: 'Order placed' })).toBeInTheDocument()
    expect(myOrders()).toHaveLength(1)
  })

  it('says what to do when the order tables have not been set up', async () => {
    fakeSupabase.state.ordersMissing = true
    const { user } = setup()
    expect(await screen.findByRole('alert')).toHaveTextContent(/supabase\/orders\.sql/)
    await openCheckout(user, 'Monstera')
    await fillDelivery(user)
    await user.click(checkout().getByRole('button', { name: 'Place order' }))
    expect(await checkout().findByText(/orders are not set up yet/i)).toBeInTheDocument()
  })
})

describe('my orders', () => {
  it('shows a friendly empty state with a link to the shop', async () => {
    setup()
    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the shop' })).toHaveAttribute('href', '#shop')
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '#orders')
  })

  it('shows only the signed-in person\'s orders', async () => {
    const mine = await seedOrder()
    const stranger = fakeSupabase.addUser({ name: 'Brian', email: 'b@example.com', password: 'whatever pass' })
    fakeSupabase.state.orders.push({ ...structuredClone(mine), id: crypto.randomUUID(), user_id: stranger.id, tracking_code: 'PCN-NOTMINE' })
    setup()
    expect(await screen.findByText(mine.tracking_code)).toBeInTheDocument()
    expect(screen.queryByText('PCN-NOTMINE')).not.toBeInTheDocument()
  })

  it('finds an order by its tracking code', async () => {
    const first = await seedOrder()
    const second = await seedOrder({ items: [{ id: 'perlite', name: 'Perlite', detail: '', priceKsh: 550, qty: 1 }] })
    const { user } = setup()
    await screen.findByText(first.tracking_code)
    expect(screen.getAllByRole('listitem', { name: /^Order PCN-/ })).toHaveLength(2)
    await user.type(screen.getByLabelText('Find an order by tracking code'), second.tracking_code.toLowerCase())
    expect(screen.getAllByRole('listitem', { name: /^Order PCN-/ })).toHaveLength(1)
    expect(screen.getByRole('listitem', { name: `Order ${second.tracking_code}` })).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Find an order by tracking code'))
    await user.type(screen.getByLabelText('Find an order by tracking code'), 'PCN-NOPE')
    expect(screen.getByText('No order has that tracking code.')).toBeInTheDocument()
  })

  it('shows the items, address, contact, payment and history', async () => {
    const placed = await seedOrder({ payment: { method: 'mpesa', reference: 'QGH7ABC123' }, items: [
      { id: 'monstera', name: 'Monstera', detail: '', priceKsh: 1600, qty: 1 },
      { id: 'potting-soil', name: 'Potting soil', detail: '', priceKsh: 350, qty: 2 },
    ] })
    setup()
    await screen.findByText(placed.tracking_code)
    const card = orderCard(placed.tracking_code)
    expect(card.getByText('2 × Potting soil')).toBeInTheDocument()
    expect(card.getByText('KSh 700')).toBeInTheDocument()
    expect(card.getByText(/Rose Apartments, Kilimani/)).toBeInTheDocument()
    expect(card.getByText(/\+254712345678/)).toBeInTheDocument()
    expect(card.getByText(/Code: QGH7ABC123/)).toBeInTheDocument()
    expect(card.getByText('We received your order')).toBeInTheDocument()
  })
})

describe('tracking an order through delivery', () => {
  it('follows the order from placed to delivered as the shop updates it', async () => {
    const placed = await seedOrder({ payment: { method: 'mpesa', reference: 'QGH7ABC123' } })
    const code = placed.tracking_code
    const { user } = setup()
    const stages = () => within(orderCard(code).getByRole('list', { name: `Progress of order ${code}` })).getAllByRole('listitem')
    const labels = (state) => stages().filter((step) => step.className.includes(`is-${state}`)).map((step) => step.querySelector('.tracker-label').textContent)
    await screen.findByText(code)
    expect(labels('current')).toEqual(['Order placed'])
    expect(screen.queryByRole('status', { name: /is on its way/i })).not.toBeInTheDocument()

    fakeSupabase.updateOrder(code, { status: 'confirmed', note: 'Payment received, thank you' })
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    await waitFor(() => expect(labels('current')).toEqual(['Confirmed']))
    expect(labels('done')).toEqual(['Order placed'])
    expect(orderCard(code).getByText(/Message from the shop: “Payment received, thank you”/)).toBeInTheDocument()

    fakeSupabase.updateOrder(code, { status: 'packed', note: 'Packed and ready for the rider' })
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    await waitFor(() => expect(labels('current')).toEqual(['Packed']))

    const eta = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    fakeSupabase.updateOrder(code, {
      status: 'out_for_delivery', note: 'Joseph left the shop a few minutes ago', eta,
      rider: { name: 'Joseph', phone: '+254700111222', vehicle: 'Motorbike KMEL 123X' },
    })
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    const transit = await screen.findByRole('status', { name: `Order ${code} is on its way` })
    expect(transit).toHaveTextContent('On the way to you')
    expect(transit).toHaveTextContent('Estimated arrival')
    expect(transit).toHaveTextContent('Joseph (Motorbike KMEL 123X)')
    expect(transit).toHaveTextContent('Joseph left the shop a few minutes ago')
    expect(within(transit).getByRole('link', { name: /call joseph/i })).toHaveAttribute('href', 'tel:+254700111222')
    expect(labels('current')).toEqual(['Out for delivery'])
    expect(labels('done')).toEqual(['Order placed', 'Confirmed', 'Packed'])
    expect(screen.getByText(code, { selector: 'strong' }).closest('.transit-banner')).toHaveTextContent('is out for delivery')

    fakeSupabase.updateOrder(code, { status: 'delivered', note: 'Delivered to the front desk' })
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    await waitFor(() => expect(labels('done')).toEqual(['Order placed', 'Confirmed', 'Packed', 'Out for delivery', 'Delivered']))
    expect(labels('current')).toEqual([])
    expect(screen.queryByRole('status', { name: /is on its way/i })).not.toBeInTheDocument()
    expect(document.querySelector('.transit-banner')).toBeNull()
    expect(orderCard(code).getByText('Delivered', { selector: '.order-badge' })).toBeInTheDocument()
    expect(screen.getByText(/All your orders are complete\./)).toBeInTheDocument()
  })

  it('lists every step in the history with the shop\'s notes', async () => {
    const placed = await seedOrder()
    const code = placed.tracking_code
    fakeSupabase.updateOrder(code, { status: 'confirmed', note: 'Confirmed by phone' })
    fakeSupabase.updateOrder(code, { status: 'packed', note: 'Boxed up' })
    setup()
    await screen.findByText(code)
    const entries = [...document.querySelectorAll('.order-history li')].map((entry) => entry.textContent)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toContain('Packed')
    expect(entries[0]).toContain('Boxed up')
    expect(entries[2]).toContain('Order placed')
    expect(entries[2]).toContain('We received your order')
  })

  it('checks again when the tab is shown, while an order is still on its way', async () => {
    const placed = await seedOrder()
    setup()
    await screen.findByText(placed.tracking_code)
    fakeSupabase.updateOrder(placed.tracking_code, { status: 'confirmed' })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(orderCard(placed.tracking_code).getByText('Confirmed', { selector: '.order-badge' })).toBeInTheDocument())
  })

  it('tracks a collection order to the shop counter', async () => {
    const placed = await seedOrder({ fulfilment: 'collection', fee: 0 })
    const code = placed.tracking_code
    const { user } = setup()
    await screen.findByText(code)
    fakeSupabase.updateOrder(code, { status: 'ready_for_collection', note: 'Ready at the counter' })
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    await waitFor(() => expect(orderCard(code).getByText('Ready for collection', { selector: '.order-badge' })).toBeInTheDocument())
    expect(orderCard(code).getAllByText(/you can collect it at the shop/i).length).toBeGreaterThan(0)
    expect(document.querySelector('.transit')).toBeNull()
  })

  it('does not mark a stage the shop skipped as missing', async () => {
    const placed = await seedOrder()
    fakeSupabase.updateOrder(placed.tracking_code, { status: 'out_for_delivery', rider: { name: 'Joseph' } })
    setup()
    await screen.findByRole('listitem', { name: `Order ${placed.tracking_code}` })
    const done = [...document.querySelectorAll('.tracker-step.is-done .tracker-label')].map((label) => label.textContent)
    expect(done).toEqual(['Order placed', 'Confirmed', 'Packed'])
    expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument()
  })

  it('tells the person when updates cannot be fetched, and recovers', async () => {
    const placed = await seedOrder()
    const { user } = setup()
    await screen.findByText(placed.tracking_code)
    fakeSupabase.state.offline = true
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    const notice = await screen.findByText(/offline or the server could not be reached/i)
    expect(notice).toBeInTheDocument()
    fakeSupabase.state.offline = false
    await user.click(within(notice.closest('.notice')).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByText(/offline or the server could not be reached/i)).not.toBeInTheDocument())
    expect(screen.getByText(placed.tracking_code)).toBeInTheDocument()
  })
})

describe('cancelling an order', () => {
  it('lets the customer cancel before the order is packed', async () => {
    const placed = await seedOrder()
    const code = placed.tracking_code
    const { user } = setup()
    await screen.findByText(code)
    await user.click(orderCard(code).getByRole('button', { name: 'Cancel this order' }))
    expect(screen.getByText(/you can only cancel until it is packed/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep my order' }))
    expect(myOrders()[0].status).toBe('placed')

    await user.click(orderCard(code).getByRole('button', { name: 'Cancel this order' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel the order' }))
    await waitFor(() => expect(myOrders()[0].status).toBe('cancelled'))
    await waitFor(() => expect(orderCard(code).getByText('Cancelled', { selector: '.order-badge' })).toBeInTheDocument())
    expect(orderCard(code).getByText(/this order was cancelled: cancelled by you/i)).toBeInTheDocument()
    expect(orderCard(code).queryByRole('button', { name: 'Cancel this order' })).not.toBeInTheDocument()
  })

  it('offers no cancel button once the order is packed or on its way', async () => {
    const packed = await seedOrder()
    fakeSupabase.updateOrder(packed.tracking_code, { status: 'packed' })
    const moving = await seedOrder()
    fakeSupabase.updateOrder(moving.tracking_code, { status: 'out_for_delivery' })
    setup()
    await screen.findByText(packed.tracking_code)
    expect(screen.queryByRole('button', { name: 'Cancel this order' })).not.toBeInTheDocument()
  })

  it('explains it when the shop packed the order before the customer cancelled', async () => {
    const placed = await seedOrder()
    const code = placed.tracking_code
    const { user } = setup()
    await screen.findByText(code)
    fakeSupabase.updateOrder(code, { status: 'packed' }) // changed on the shop's side, the page does not know yet
    await user.click(orderCard(code).getByRole('button', { name: 'Cancel this order' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel the order' }))
    expect(await screen.findByText(/can no longer be cancelled/i)).toBeInTheDocument()
    expect(myOrders()[0].status).toBe('packed')
  })
})
