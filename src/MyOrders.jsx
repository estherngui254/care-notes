import { useState } from 'react'
import { CheckIcon, PhoneIcon, TruckIcon } from './icons.jsx'
import {
  STATUS_LABELS, STATUS_MEANINGS, canCancel, describeStatusLine, flowFor, formatDateTime, isFinished, isInTransit, stageTimes, stepIndex,
} from './orderStatus.js'
import { MPESA, formatKsh, formatUsd, usdFromKsh } from './shopItems.js'

// The stages of one order, with when each was reached.
export function OrderTracker({ order }) {
  if (order.status === 'cancelled') {
    return <p className="tracker-cancelled">This order was cancelled{order.note ? `: ${order.note}` : '.'}</p>
  }
  const flow = flowFor(order)
  const current = stepIndex(order)
  const times = stageTimes(order)
  const finished = isFinished(order)
  return (
    <ol className="tracker" aria-label={`Progress of order ${order.code}`}>
      {flow.map((stage, index) => {
        const state = index < current || (finished && index === current) ? 'done' : index === current ? 'current' : 'todo'
        return (
          <li key={stage} className={`tracker-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="tracker-dot" aria-hidden="true">{state === 'done' ? <CheckIcon size={14} /> : index + 1}</span>
            <span className="tracker-text">
              <span className="tracker-label">{STATUS_LABELS[stage]}</span>
              <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'current' ? ' (current step)' : ' (not yet)'}</span>
              {times[stage] && <span className="tracker-time">{formatDateTime(times[stage])}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function TransitCard({ order }) {
  const { rider, eta } = order
  return (
    <div className="transit" role="status" aria-label={`Order ${order.code} is on its way`}>
      <span className="transit-icon" aria-hidden="true"><TruckIcon size={26} /></span>
      <div>
        <p className="transit-title">On the way to you</p>
        {eta && <p>Estimated arrival: <strong>{formatDateTime(eta)}</strong></p>}
        {rider?.name && (
          <p>
            Rider: <strong>{rider.name}</strong>{rider.vehicle ? ` (${rider.vehicle})` : ''}
            {rider.phone && (
              <> <a className="call-link" href={`tel:${rider.phone}`}><PhoneIcon size={15} /> Call {rider.name}</a></>
            )}
          </p>
        )}
        {order.note && <p className="transit-note">“{order.note}”</p>}
      </div>
    </div>
  )
}

function OrderCard({ order, onCancel }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const delivery = order.fulfilment === 'delivery'

  async function cancel() {
    setBusy(true)
    setProblem('')
    const result = await onCancel(order.id)
    setBusy(false)
    if (result.error) setProblem(result.error.text)
    else setConfirming(false)
  }

  const events = [...order.events].reverse()

  return (
    <li className={`order-card order-${order.status}`} aria-label={`Order ${order.code}`}>
      <div className="order-head">
        <div>
          <p className="order-code">{order.code}</p>
          <p className="order-date">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="order-head-right">
          <span className={`order-badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
          <p className="order-total-line">{formatKsh(order.totalKsh)} <small>about {formatUsd(usdFromKsh(order.totalKsh))}</small></p>
        </div>
      </div>

      {isInTransit(order) ? <TransitCard order={order} /> : <p className="order-meaning">{describeStatusLine(order)}</p>}
      {!isInTransit(order) && order.note && order.status !== 'cancelled' && order.status !== 'placed' && (
        <p className="order-note">Message from the shop: “{order.note}”</p>
      )}
      {!isInTransit(order) && order.eta && !isFinished(order) && (
        <p className="order-note">Expected: <strong>{formatDateTime(order.eta)}</strong></p>
      )}

      <OrderTracker order={order} />

      <details className="order-details">
        <summary>Order details and history</summary>
        <div className="order-grid">
          <div>
            <h4>Items</h4>
            <ul className="order-items">
              {order.items.map((item) => (
                <li key={item.id}><span>{item.qty} × {item.name}</span><span>{formatKsh(item.priceKsh * item.qty)}</span></li>
              ))}
              <li><span>Subtotal</span><span>{formatKsh(order.subtotalKsh)}</span></li>
              <li><span>{delivery ? 'Delivery' : 'Collection'}</span><span>{delivery ? formatKsh(order.deliveryFeeKsh) : 'Free'}</span></li>
              <li className="order-total"><span>Total</span><span>{formatKsh(order.totalKsh)}</span></li>
            </ul>
          </div>
          <div>
            <h4>{delivery ? 'Delivery address' : 'Collection'}</h4>
            {delivery && order.address ? (
              <p>
                {order.address.street}<br />
                {order.address.area}
                {order.address.landmark && <><br />Landmark: {order.address.landmark}</>}
                {order.address.notes && <><br />Note: {order.address.notes}</>}
              </p>
            ) : (
              <p>You will collect this order from the shop.</p>
            )}
            <h4>Contact</h4>
            <p>{order.customer.name}<br />{order.customer.phone}</p>
            <h4>Payment</h4>
            <p>
              {order.payment.method === 'mpesa'
                ? <>{MPESA.provider}, {MPESA.method} till {MPESA.till}{order.payment.reference ? <><br />Code: {order.payment.reference}</> : <><br />Code not entered yet</>}</>
                : delivery ? 'Cash on delivery' : 'Pay at the shop'}
            </p>
          </div>
        </div>

        <h4>History</h4>
        <ul className="order-history">
          {events.map((event) => (
            <li key={event.id}>
              <span className="history-status">{STATUS_LABELS[event.status] ?? event.status}</span>
              <span className="history-time">{formatDateTime(event.createdAt)}</span>
              {event.note && <span className="history-note">{event.note}</span>}
            </li>
          ))}
        </ul>
        <p className="hint">{STATUS_MEANINGS[order.status]}</p>
      </details>

      {canCancel(order) && (
        <div className="order-actions">
          {!confirming ? (
            <button type="button" className="secondary" onClick={() => setConfirming(true)}>Cancel this order</button>
          ) : (
            <div className="forgot-panel" role="alert">
              <p>Cancel order {order.code}? You can only cancel until it is packed.</p>
              {problem && <p className="error">{problem}</p>}
              <div className="actions">
                <button type="button" className="danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Yes, cancel the order'}</button>
                <button type="button" className="secondary" disabled={busy} onClick={() => setConfirming(false)}>Keep my order</button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default function MyOrders({ orders, status, detail, refreshing, checkedAt, onRefresh, onCancel }) {
  const [search, setSearch] = useState('')
  const term = search.trim().toUpperCase()
  const shown = term ? orders.filter((order) => order.code.includes(term)) : orders

  return (
    <section className="orders no-print" id="orders" aria-labelledby="orders-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Track your deliveries</p>
          <h2 id="orders-heading"><TruckIcon size={22} /> My orders {orders.length > 0 && <span className="count">{orders.length}</span>}</h2>
        </div>
        <button type="button" className="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Checking…' : 'Check for updates'}
        </button>
      </div>

      {status === 'setup' && <p className="notice" role="alert">{detail}</p>}
      {status === 'error' && (
        <p className="notice" role="alert">{detail} <button type="button" className="link" onClick={onRefresh}>Try again</button></p>
      )}
      {status === 'loading' && <p className="hint" role="status">Loading your orders…</p>}

      {status === 'ready' && orders.length === 0 && (
        <div className="empty">
          <h3>No orders yet</h3>
          <p>When you order from the shop, you can follow it here, from packing to your door.</p>
          <a className="button-link" href="#shop">Go to the shop</a>
        </div>
      )}

      {orders.length > 0 && (
        <>
          <div className="order-search">
            <label htmlFor="order-search">Find an order by tracking code</label>
            <input id="order-search" type="search" value={search} placeholder="PCN-ABC123" autoCapitalize="characters"
              onChange={(event) => setSearch(event.target.value)} />
          </div>
          <p className="hint" role="status">
            {checkedAt && `Last checked ${formatDateTime(checkedAt.toISOString())}. `}
            {orders.some((order) => !isFinished(order)) ? 'Orders on their way update automatically.' : 'All your orders are complete.'}
          </p>
          {shown.length === 0 ? (
            <div className="shop-empty">No order has that tracking code.</div>
          ) : (
            <ul className="order-list" aria-label="Your orders">
              {shown.map((order) => <OrderCard key={order.id} order={order} onCancel={onCancel} />)}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
