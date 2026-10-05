import { useEffect, useMemo, useState } from 'react'
import { BagIcon } from './icons.jsx'
import CheckoutForm from './CheckoutForm.jsx'
import { MPESA, SHOP_CATEGORIES, SHOP_ITEMS, formatKsh, formatUsd, usdFromKsh } from './shopItems.js'
import { fetchOutOfStock } from './shopStock.js'

const ALL = 'all'

function categoryLabel(id) {
  return SHOP_CATEGORIES.find((category) => category.id === id)?.label ?? ''
}

// `person` is the signed-in customer (used to fill in the checkout form) and `onPlaceOrder` sends an order to the shop.
export default function PlantShop({ person, onPlaceOrder }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [basket, setBasket] = useState({})
  const [checkingOut, setCheckingOut] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [openGroups, setOpenGroups] = useState(() => new Set())
  // What the shop has flagged as out of stock: item id -> its note. Empty until the table answers.
  const [outOfStock, setOutOfStock] = useState(() => new Map())
  const [stockProblem, setStockProblem] = useState('')
  const [stockCheckedAt, setStockCheckedAt] = useState(0)

  const filtering = query.trim() !== '' || category !== ALL

  const items = useMemo(() => {
    const term = query.trim().toLowerCase()
    return SHOP_ITEMS.filter((item) => {
      if (category !== ALL && item.category !== category) return false
      if (term && !`${item.name} ${item.detail}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [query, category])

  // While a filter is active, open every group that still has matches so the results are visible.
  useEffect(() => {
    if (!filtering) return
    setOpenGroups((prev) => {
      const next = new Set(prev)
      for (const { id } of SHOP_CATEGORIES) {
        if (items.some((item) => item.category === id)) next.add(id)
      }
      return next
    })
  }, [filtering, items])

  // Ask the shop's stock table which items are unavailable. Shown quietly if it is not set up:
  // a missing table must not stop people buying what is in stock.
  async function loadStock() {
    const result = await fetchOutOfStock()
    if (result.error) {
      setStockProblem(result.error.text)
      return
    }
    setOutOfStock(result.outOfStock)
    setStockCheckedAt(Date.now())
  }

  useEffect(() => { loadStock() }, [])

const lines = SHOP_ITEMS
    .filter((item) => basket[item.id] > 0)
    .map((item) => ({ ...item, qty: basket[item.id] }))
  const basketCount = lines.reduce((total, line) => total + line.qty, 0)
  // Anything the shop has flagged since it was added stops the order being placed.
  const unavailable = lines.filter((line) => outOfStock.has(line.id))
  const totalKsh = lines.reduce((total, line) => total + line.priceKsh * line.qty, 0)
  const totalUsd = usdFromKsh(totalKsh)

  function clearFilters() {
    setQuery('')
    setCategory(ALL)
  }

  function toggleGroup(id) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addItem(id) {
    setBasket((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
    setPlacedOrder(null)
  }

  function changeQty(id, delta) {
    setBasket((current) => {
      const next = { ...current }
      const qty = (next[id] ?? 0) + delta
      if (qty > 0) next[id] = qty
      else delete next[id]
      return next
    })
  }

  function emptyBasket() {
    setBasket({})
    setCheckingOut(false)
  }

  const placeOrder = (order) => (onPlaceOrder
    ? onPlaceOrder(order)
    : Promise.resolve({ error: { text: 'Ordering is not available right now.' } }))

  function orderPlaced(order) {
    setPlacedOrder(order)
    setBasket({})
    setCheckingOut(false)
  }

  // With nothing left in the basket, or with something unavailable in it, there is nothing to check out.
  const showCheckout = checkingOut && lines.length > 0 && unavailable.length === 0

  // The shop can sell the last one while this page is open, so stock is checked again on demand and
  // at the moment of ordering.
  async function refreshStock() {
    await loadStock()
  }

  async function startCheckout() {
    setPlacedOrder(null)
    await loadStock()
    setCheckingOut(true)
  }

  return (
    <section className="shop no-print" id="shop" aria-labelledby="shop-heading">
      <p className="eyebrow">Plant shop</p>
      <h2 id="shop-heading"><BagIcon size={22} /> Buy plants, media and pots</h2>
      <p className="hint">
        Browse indoor ornamental plants and flowers, plant media and pots. Every price shows the
        Kenyan shilling amount and its approximate dollar value. Nothing is charged automatically:
        build a basket, place an order, then pay by {MPESA.provider} ({MPESA.method} till{' '}
        {MPESA.till}) or cash on collection or delivery.
      </p>

      <div className="controls shop-filters" role="search" aria-label="Filter the shop">
        <div className="control control-wide">
          <label htmlFor="shop-search">Search the shop</label>
          <input id="shop-search" type="search" value={query} placeholder="Name or size"
            onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="control control-wide">
          <label htmlFor="shop-category">Category</label>
          <select id="shop-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value={ALL}>All categories</option>
            {SHOP_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        {filtering && (
          <button type="button" className="secondary control-clear" onClick={clearFilters}>Clear filters</button>
        )}
        {stockCheckedAt && (
          <button type="button" className="secondary control-clear" onClick={refreshStock}>Check stock</button>
        )}
      </div>

      <p className="guide-count" aria-live="polite">
        {filtering
          ? `Showing ${items.length} of ${SHOP_ITEMS.length} items`
          : `${SHOP_ITEMS.length} items for sale`}
      </p>

      {stockProblem && <p className="hint">{stockProblem}</p>}

      {lines.length > 0 && (
        <div className="basket" role="region" aria-labelledby="basket-heading">
          <div className="basket-head">
            <h3 id="basket-heading">
              Your basket <span className="count">{basketCount} {basketCount === 1 ? 'item' : 'items'}</span>
            </h3>
            <button type="button" className="link" onClick={emptyBasket}>Empty basket</button>
          </div>
          <ul className="basket-list">
            {lines.map((line) => (
              <li key={line.id}>
                <span className="basket-name">{line.name}</span>
                <span className="basket-price">
                  {formatKsh(line.priceKsh)} · {formatUsd(usdFromKsh(line.priceKsh))} each
                </span>
                <span className="qty">
                  <button type="button" aria-label={`Remove one ${line.name}`}
                    onClick={() => changeQty(line.id, -1)}>−</button>
                  <span className="qty-value">{line.qty}</span>
                  <button type="button" aria-label={`Add one ${line.name}`}
                    onClick={() => changeQty(line.id, 1)}>+</button>
                </span>
                <button type="button" className="link" aria-label={`Remove ${line.name} from basket`}
                  onClick={() => changeQty(line.id, -line.qty)}>Remove</button>
              </li>
            ))}
          </ul>
          <p className="basket-total">
            Total <strong>{formatKsh(totalKsh)}</strong> <span>about {formatUsd(totalUsd)}</span>
          </p>
          <p className="basket-pay">
            Pay with <strong>{MPESA.provider}</strong> — {MPESA.method} till{' '}
            <strong className="till">{MPESA.till}</strong>, or cash on collection or delivery.
          </p>
          {unavailable.length > 0 && (
            <p className="error" role="alert">
              {unavailable.length === 1 ? unavailable[0].name : unavailable.map((line) => line.name).join(' and ')}{' '}
              {unavailable.length === 1 ? 'is' : 'are'} out of stock. Please remove{' '}
              {unavailable.length === 1 ? 'it' : 'them'} from your basket.
            </p>
          )}
          {!showCheckout && unavailable.length === 0 && (
            <div className="actions">
              <button type="button" onClick={startCheckout}>Checkout</button>
            </div>
          )}
          {showCheckout && (
            <CheckoutForm lines={lines} subtotalKsh={totalKsh} person={person} onPlace={placeOrder}
              onPlaced={orderPlaced} onBack={() => setCheckingOut(false)} />
          )}
        </div>
      )}

      {placedOrder && (
        <div className="order-placed" role="status" aria-label="Order placed">
          <h3>Thank you, your order is placed</h3>
          <p>
            Your tracking code is <strong className="tracking-code">{placedOrder.code}</strong>. Use it to follow your order
            in <strong>My orders</strong>.
          </p>
          <p>
            {placedOrder.fulfilment === 'delivery' ? 'We will deliver to ' : 'You will collect from the shop. '}
            {placedOrder.address && <strong>{placedOrder.address.street}, {placedOrder.address.area}</strong>}
            {placedOrder.address && '. '}
            Total <strong>{formatKsh(placedOrder.totalKsh)}</strong> (about {formatUsd(usdFromKsh(placedOrder.totalKsh))}).
          </p>
          <p>
            {placedOrder.payment.method === 'mpesa'
              ? placedOrder.payment.reference
                ? <>We have your M-PESA code <strong>{placedOrder.payment.reference}</strong>. We will confirm your payment.</>
                : <>Pay with {MPESA.provider} to {MPESA.method} till <strong className="till">{MPESA.till}</strong>. We will confirm your order once your payment arrives.</>
              : <>You will pay in cash {placedOrder.fulfilment === 'delivery' ? 'when the rider arrives' : 'at the shop'}.</>}
          </p>
          <div className="actions">
            <a className="button-link" href="#orders">Track this order</a>
            <button type="button" className="secondary" onClick={() => setPlacedOrder(null)}>Keep shopping</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="shop-empty">
          No items match your search.
          <button type="button" className="link" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="shop-groups">
          {SHOP_CATEGORIES.map(({ id, label }) => {
            const groupItems = items.filter((item) => item.category === id)
            if (groupItems.length === 0) return null
            return (
              <details key={id} className="shop-group" open={openGroups.has(id)}>
                <summary onClick={() => toggleGroup(id)}>
                  <span className="shop-group-title">{label}</span>
                  <span className="shop-group-count">
                    {groupItems.length} {groupItems.length === 1 ? 'item' : 'items'}
                  </span>
                </summary>
                <div className="shop-table-wrap">
                  <table className="shop-table" aria-label={`${label} for sale`}>
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Details</th>
                        <th scope="col" className="num">KSh</th>
                        <th scope="col" className="num">USD</th>
                        <th scope="col" className="num"><span className="sr-only">Add to basket</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupItems.map((item) => {
                        const note = outOfStock.get(item.id)
                        const sold = outOfStock.has(item.id)
                        return (
                          <tr key={item.id}>
                            <th scope="row" className="shop-item">
                              {item.name} <span className="kind">{categoryLabel(item.category)}</span>
                              {sold && <span className="stock-flag">Out of stock</span>}
                            </th>
                            <td className="shop-detail">{item.detail}</td>
                            <td className="num shop-ksh">{formatKsh(item.priceKsh)}</td>
                            <td className="num shop-usd">{formatUsd(usdFromKsh(item.priceKsh))}</td>
                            <td className="num shop-action">
                              {sold ? (
                                <span className="stock-note">{note || 'Ask the shop'}</span>
                              ) : (
                                <button type="button" className="secondary" onClick={() => addItem(item.id)}
                                  aria-label={`Add ${item.name} to basket`}>Add to basket</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}