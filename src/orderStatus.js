// The stages an order moves through. The shop moves it along from the Supabase dashboard
// (see docs/order-management.md); the customer sees the same stages on the tracking page.

export const STATUS_LABELS = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  ready_for_collection: 'Ready for collection',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

// What each stage means, in the customer's words.
export const STATUS_MEANINGS = {
  placed: 'We have received your order and will confirm it shortly.',
  confirmed: 'Your order is confirmed and we are getting it ready.',
  packed: 'Your order is packed and waiting for the rider.',
  out_for_delivery: 'Your order is on its way to you.',
  delivered: 'Your order was delivered. Enjoy your plants!',
  ready_for_collection: 'Your order is ready. You can collect it at the shop.',
  collected: 'You collected your order. Enjoy your plants!',
  cancelled: 'This order was cancelled.',
}

// The steps shown on the tracker for each way of getting an order.
export const FLOWS = {
  delivery: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'],
  collection: ['placed', 'confirmed', 'ready_for_collection', 'collected'],
}

const FINISHED = ['delivered', 'collected', 'cancelled']

export const flowFor = (order) => FLOWS[order.fulfilment] ?? FLOWS.delivery
export const isFinished = (order) => FINISHED.includes(order.status)
export const isActive = (order) => !isFinished(order)
export const isInTransit = (order) => order.status === 'out_for_delivery'
export const canCancel = (order) => order.status === 'placed' || order.status === 'confirmed'

// Position of the order on its tracker. A stage the shop skipped (say, going straight from confirmed
// to out for delivery) still counts as passed. A cancelled order has no position.
export function stepIndex(order) {
  const flow = flowFor(order)
  const index = flow.indexOf(order.status)
  return index === -1 ? -1 : index
}

// When each stage was reached, taken from the order's history.
export function stageTimes(order) {
  const times = {}
  for (const event of order.events ?? []) {
    if (!(event.status in times)) times[event.status] = event.createdAt
  }
  return times
}

// "12 Oct, 3:30 pm" in the person's own language and time zone.
export function formatDateTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function describeStatusLine(order) {
  if (order.status === 'out_for_delivery' && order.rider?.name) return `${order.rider.name} is bringing your order`
  return STATUS_MEANINGS[order.status] ?? ''
}
