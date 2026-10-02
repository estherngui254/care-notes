import { supabase } from './supabaseClient.js'

// Orders live in Supabase (see supabase/orders.sql). A customer can only read their own orders and
// change them through two functions: place_order and cancel_my_order. Nothing here throws.

const NETWORK = 'You are offline or the server could not be reached. Check your connection and try again.'
const SETUP = 'Orders are not set up yet. The person running this app needs to run supabase/orders.sql in the Supabase SQL Editor.'

// The database's own messages for a refused order are written for customers, so they are shown as they are.
function describe(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42883' || /could not find the (table|function)/i.test(message)) {
    return { kind: 'setup', text: SETUP }
  }
  if (code === 'P0001') {
    if (/not signed in/i.test(message)) return { kind: 'auth', text: 'Please sign in again to continue.' }
    return { kind: 'refused', text: message }
  }
  if (error?.status === 401 || error?.status === 403 || code === '42501' || /jwt/i.test(message)) {
    return { kind: 'auth', text: 'Your sign-in has expired. Sign out and sign in again.' }
  }
  if (error?.name === 'TypeError' || /failed to fetch|network|load failed/i.test(message)) return { kind: 'network', text: NETWORK }
  return { kind: 'other', text: 'Something went wrong with your order. Please try again.' }
}

// Turns a database row (and its history) into the shape the screens use.
export function mapOrder(row, events = []) {
  return {
    id: row.id,
    code: row.tracking_code,
    status: row.status,
    fulfilment: row.fulfilment,
    items: Array.isArray(row.items) ? row.items : [],
    subtotalKsh: row.subtotal_ksh ?? 0,
    deliveryFeeKsh: row.delivery_fee_ksh ?? 0,
    totalKsh: row.total_ksh ?? 0,
    customer: row.customer ?? {},
    address: row.address ?? null,
    payment: row.payment ?? {},
    rider: row.rider ?? null,
    eta: row.eta ?? null,
    note: row.note ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: events.map((event) => ({ id: event.id, status: event.status, note: event.note ?? '', createdAt: event.created_at })),
  }
}

export async function placeOrder(order) {
  try {
    const { data, error } = await supabase.rpc('place_order', {
      p_items: order.items,
      p_fulfilment: order.fulfilment,
      p_customer: order.customer,
      p_address: order.address,
      p_payment: order.payment,
      p_delivery_fee: order.deliveryFee,
    })
    if (error) return { error: describe(error) }
    // The database has already recorded the first history entry. Show it straight away.
    return { order: mapOrder(data, [{ id: 0, status: data.status, note: 'We received your order', created_at: data.created_at }]) }
  } catch (error) {
    return { error: describe(error) }
  }
}

export async function fetchOrders(userId) {
  try {
    const { data: rows, error } = await supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) return { error: describe(error) }
    if (!rows?.length) return { orders: [] }
    const { data: events, error: eventError } = await supabase
      .from('order_events').select('*').in('order_id', rows.map((row) => row.id)).order('created_at', { ascending: true })
    if (eventError) return { error: describe(eventError) }
    const byOrder = new Map()
    for (const event of events ?? []) byOrder.set(event.order_id, [...(byOrder.get(event.order_id) ?? []), event])
    return { orders: rows.map((row) => mapOrder(row, byOrder.get(row.id) ?? [])) }
  } catch (error) {
    return { error: describe(error) }
  }
}

export async function cancelOrder(orderId) {
  try {
    const { data, error } = await supabase.rpc('cancel_my_order', { p_order: orderId })
    if (error) return { error: describe(error) }
    return { order: mapOrder(data) }
  } catch (error) {
    return { error: describe(error) }
  }
}
