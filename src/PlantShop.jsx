import { useMemo, useState } from 'react'
import { BagIcon } from './icons.jsx'
import { MPESA, SHOP_CATEGORIES, SHOP_ITEMS, formatKsh, formatUsd, usdFromKsh } from './shopItems.js'

const ALL = 'all'

function categoryLabel(id) {
  return SHOP_CATEGORIES.find((category) => category.id === id)?.label ?? ''
}

export default function PlantShop() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [basket, setBasket] = useState({})
  const [order, setOrder] = useState('')

  const filtering = query.trim() !== '' || category !== ALL

  const items = useMemo(() => {
    const term = query.trim().toLowerCase()
    return SHOP_ITEMS.filter((item) => {
      if (category !== ALL && item.category !== category) return false
      if (term && !`${item.name} ${item.detail}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [query, category])

  const lines = SHOP_ITEMS
    .filter((item) => basket[item.id] > 0)
    .map((item) => ({ ...item, qty: basket[item.id] }))
  const basketCount = lines.reduce((total, line) => total + line.qty, 0)
  const totalKsh = lines.reduce((total, line) => total + line.priceKsh * line.qty, 0)
  const totalUsd = usdFromKsh(totalKsh)

  function clearFilters() {
    setQuery('')
    setCategory(ALL)
  }

  function addItem(id) {
    setBasket((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
    setOrder('')
  }

  function changeQty(id, delta) {
    setBasket((current) => {
      const next = { ...current }
      const qty = (next[id] ?? 0) + delta
      if (qty > 0) next[id] = qty
      else delete next[id]
      return next
    })
    setOrder('')
  }

  function placeOrder() {
    if (basketCount === 0) return
    setOrder(
      `Order saved in this browser: ${basketCount} ${basketCount === 1 ? 'item' : 'items'}, `
      + `${formatKsh(totalKsh)} (about ${formatUsd(totalUsd)}). `
      + `Pay ${MPESA.provider} to ${MPESA.method} till ${MPESA.till}, `
      + 'or pay cash on collection or delivery. Nothing is charged from this site.',
    )
    setBasket({})
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
      </div>

      <p className="guide-count" aria-live="polite">
        {filtering
          ? `Showing ${items.length} of ${SHOP_ITEMS.length} items`
          : `${SHOP_ITEMS.length} items for sale`}
      </p>

      {lines.length > 0 && (
        <div className="basket" role="region" aria-labelledby="basket-heading">
          <div className="basket-head">
            <h3 id="basket-heading">
              Your basket <span className="count">{basketCount} {basketCount === 1 ? 'item' : 'items'}</span>
            </h3>
            <button type="button" className="link" onClick={() => setBasket({})}>Empty basket</button>
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
          <div className="actions">
            <button type="button" onClick={placeOrder}>Place order</button>
          </div>
        </div>
      )}
      {order && <p className="hint shop-order" role="status">{order}</p>}

      {items.length === 0 ? (
        <div className="shop-empty">
          No items match your search.
          <button type="button" className="link" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="shop-table-wrap">
          <table className="shop-table" aria-label="Items for sale">
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
              {items.map((item) => (
                <tr key={item.id}>
                  <th scope="row" className="shop-item">
                    {item.name} <span className="kind">{categoryLabel(item.category)}</span>
                  </th>
                  <td className="shop-detail">{item.detail}</td>
                  <td className="num shop-ksh">{formatKsh(item.priceKsh)}</td>
                  <td className="num shop-usd">{formatUsd(usdFromKsh(item.priceKsh))}</td>
                  <td className="num shop-action">
                    <button type="button" className="secondary" onClick={() => addItem(item.id)}
                      aria-label={`Add ${item.name} to basket`}>Add to basket</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}