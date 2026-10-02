import { useId, useRef, useState } from 'react'
import { EMPTY_CHECKOUT, FULFILMENT, PAYMENT, buildOrder, deliveryFee, validateCheckout } from './checkout.js'
import { COLLECTION_POINT, DELIVERY_ZONES, MPESA, formatKsh, formatUsd, usdFromKsh } from './shopItems.js'

function Field({ id, label, optional, error, children, hint }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{optional && <span className="optional"> (optional)</span>}</label>
      {children}
      {error ? <p className="error" id={`${id}-error`} role="alert">{error}</p>
        : hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  )
}

// Checkout for the plant shop: how the order gets to the customer, who and where it is for, and how
// they will pay. Nothing is charged here. Payment is M-PESA to the shop's till, or cash.
export default function CheckoutForm({ lines, subtotalKsh, person, onPlace, onPlaced, onBack }) {
  const uid = useId()
  const formRef = useRef(null)
  const [form, setForm] = useState({ ...EMPTY_CHECKOUT, name: person?.name ?? '', email: person?.email ?? '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  const delivery = form.fulfilment === FULFILMENT.delivery
  const fee = deliveryFee(form.fulfilment, form.zone)
  const totalKsh = subtotalKsh + fee
  const id = (name) => `${uid}-${name}`
  const set = (name) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [name]: value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }))
  }
  const describe = (name, hint) => (errors[name] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined)

  async function submit(event) {
    event.preventDefault()
    setServerError('')
    const found = validateCheckout(form)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      const first = ['name', 'phone', 'zone', 'street', 'mpesaCode'].find((name) => found[name])
      formRef.current?.querySelector(`#${CSS.escape(id(first))}`)?.focus()
      return
    }
    setBusy(true)
    const result = await onPlace(buildOrder(form, lines))
    setBusy(false)
    if (result.error) setServerError(result.error.text)
    else onPlaced(result.order)
  }

  return (
    <form className="checkout" ref={formRef} onSubmit={submit} noValidate aria-label="Checkout">
      <h3>Checkout</h3>

      <fieldset className="choice">
        <legend>How would you like to get your order?</legend>
        <label className="radio">
          <input type="radio" name={id('fulfilment')} checked={delivery}
            onChange={() => setForm((current) => ({ ...current, fulfilment: FULFILMENT.delivery }))} />
          Delivery to my address
        </label>
        <label className="radio">
          <input type="radio" name={id('fulfilment')} checked={!delivery}
            onChange={() => setForm((current) => ({ ...current, fulfilment: FULFILMENT.collection }))} />
          I will collect from the shop
        </label>
      </fieldset>

      <div className="field-row">
        <Field id={id('name')} label="Full name" error={errors.name}>
          <input id={id('name')} value={form.name} onChange={set('name')} autoComplete="name" maxLength={60}
            aria-invalid={Boolean(errors.name)} aria-describedby={describe('name')} />
        </Field>
        <Field id={id('phone')} label="Phone number" error={errors.phone} hint="The rider or shop will call this number.">
          <input id={id('phone')} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel"
            placeholder="0712 345 678" aria-invalid={Boolean(errors.phone)} aria-describedby={describe('phone', true)} />
        </Field>
      </div>
      <Field id={id('email')} label="Email" optional>
        <input id={id('email')} type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={80} />
      </Field>

      {delivery ? (
        <>
          <Field id={id('zone')} label="Delivery area" error={errors.zone}>
            <select id={id('zone')} value={form.zone} onChange={set('zone')} aria-invalid={Boolean(errors.zone)}
              aria-describedby={describe('zone')}>
              <option value="">Choose your area</option>
              {DELIVERY_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.label} (KSh {zone.feeKsh})</option>
              ))}
            </select>
          </Field>
          <Field id={id('street')} label="Street, building or estate and house number" error={errors.street}>
            <input id={id('street')} value={form.street} onChange={set('street')} autoComplete="street-address" maxLength={120}
              aria-invalid={Boolean(errors.street)} aria-describedby={describe('street')} />
          </Field>
          <div className="field-row">
            <Field id={id('landmark')} label="Landmark" optional>
              <input id={id('landmark')} value={form.landmark} onChange={set('landmark')} maxLength={80} placeholder="Near the petrol station" />
            </Field>
            <Field id={id('notes')} label="Delivery notes" optional>
              <input id={id('notes')} value={form.notes} onChange={set('notes')} maxLength={120} placeholder="Call from the gate" />
            </Field>
          </div>
        </>
      ) : (
        <div className="tip collection-info">
          <strong>Collect from {COLLECTION_POINT.name}</strong><br />
          {COLLECTION_POINT.address}<br />
          {COLLECTION_POINT.hours}. We will tell you when your order is ready.
        </div>
      )}

      <fieldset className="choice">
        <legend>How will you pay?</legend>
        <label className="radio">
          <input type="radio" name={id('payment')} checked={form.payment === PAYMENT.mpesa}
            onChange={() => setForm((current) => ({ ...current, payment: PAYMENT.mpesa }))} />
          {MPESA.provider} ({MPESA.method} till {MPESA.till})
        </label>
        <label className="radio">
          <input type="radio" name={id('payment')} checked={form.payment === PAYMENT.cash}
            onChange={() => setForm((current) => ({ ...current, payment: PAYMENT.cash }))} />
          {delivery ? 'Cash on delivery' : 'Pay at the shop'}
        </label>
      </fieldset>

      {form.payment === PAYMENT.mpesa ? (
        <div className="payment-help">
          <p>
            Pay <strong>{formatKsh(totalKsh)}</strong> with {MPESA.provider}: Lipa na M-PESA, {MPESA.method}, till number{' '}
            <strong className="till">{MPESA.till}</strong>. Nothing is charged from this site.
          </p>
          <Field id={id('mpesaCode')} label="M-PESA confirmation code" optional error={errors.mpesaCode}
            hint="Enter it from the M-PESA message once you have paid, so we can match your payment.">
            <input id={id('mpesaCode')} value={form.mpesaCode} onChange={set('mpesaCode')} maxLength={14} autoCapitalize="characters"
              placeholder="QGH7ABC123" aria-invalid={Boolean(errors.mpesaCode)} aria-describedby={describe('mpesaCode', true)} />
          </Field>
        </div>
      ) : (
        <p className="hint">You will pay {formatKsh(totalKsh)} in cash {delivery ? 'when the rider arrives' : 'at the shop'}.</p>
      )}

      <div className="order-summary" role="group" aria-label="Order summary">
        <h4>Order summary</h4>
        <ul>
          {lines.map((line) => (
            <li key={line.id}>
              <span>{line.qty} × {line.name}</span>
              <span>{formatKsh(line.priceKsh * line.qty)}</span>
            </li>
          ))}
          <li><span>Subtotal</span><span>{formatKsh(subtotalKsh)}</span></li>
          <li>
            <span>{delivery ? 'Delivery' : 'Collection'}</span>
            <span>{delivery ? (form.zone ? formatKsh(fee) : 'Choose an area') : 'Free'}</span>
          </li>
          <li className="order-total">
            <span>Total</span>
            <span><strong>{formatKsh(totalKsh)}</strong> <small>about {formatUsd(usdFromKsh(totalKsh))}</small></span>
          </li>
        </ul>
      </div>

      {serverError && <p className="error" role="alert">{serverError}</p>}
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? 'Placing your order…' : 'Place order'}</button>
        <button type="button" className="secondary" onClick={onBack} disabled={busy}>Back to basket</button>
      </div>
    </form>
  )
}
