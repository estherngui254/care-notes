import { DELIVERY_ZONES } from './shopItems.js'

export const FULFILMENT = { delivery: 'delivery', collection: 'collection' }
export const PAYMENT = { mpesa: 'mpesa', cash: 'cash' }

// Kenyan mobile numbers: 07xx xxx xxx, 01xx xxx xxx, +254 7xx xxx xxx, 254 7xx xxx xxx.
// Returns the number as +254XXXXXXXXX, or '' when it is not a valid mobile number.
export function normalizePhone(input) {
  const digits = String(input ?? '').replace(/[\s().-]/g, '')
  const match = digits.match(/^(?:\+?254|0)([17]\d{8})$/)
  return match ? `+254${match[1]}` : ''
}

// An M-PESA confirmation message starts with a 10-character code such as QGH7ABC123.
export const normalizeMpesaCode = (input) => String(input ?? '').replace(/\s/g, '').toUpperCase()

export function zoneById(id) {
  return DELIVERY_ZONES.find((zone) => zone.id === id) ?? null
}

export function deliveryFee(fulfilment, zoneId) {
  if (fulfilment !== FULFILMENT.delivery) return 0
  return zoneById(zoneId)?.feeKsh ?? 0
}

export const EMPTY_CHECKOUT = {
  fulfilment: FULFILMENT.delivery,
  name: '',
  phone: '',
  email: '',
  zone: '',
  street: '',
  landmark: '',
  notes: '',
  payment: PAYMENT.mpesa,
  mpesaCode: '',
}

export function validateCheckout(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter your name.'
  else if (form.name.trim().length > 60) errors.name = 'Keep your name under 60 characters.'

  if (!form.phone.trim()) errors.phone = 'Enter a phone number so the rider or shop can reach you.'
  else if (!normalizePhone(form.phone)) errors.phone = 'Enter a Kenyan mobile number, like 0712 345 678 or +254 712 345 678.'

  if (form.fulfilment === FULFILMENT.delivery) {
    if (!zoneById(form.zone)) errors.zone = 'Choose where we should deliver.'
    if (form.street.trim().length < 3) errors.street = 'Enter the street, building or estate and house number.'
  }

  if (form.payment === PAYMENT.mpesa && form.mpesaCode.trim()) {
    if (!/^[A-Z0-9]{10}$/.test(normalizeMpesaCode(form.mpesaCode))) {
      errors.mpesaCode = 'An M-PESA code has 10 letters and numbers, like QGH7ABC123. Leave it empty if you have not paid yet.'
    }
  }
  return errors
}

// Turns a valid form and the basket into what is sent to the shop's database.
export function buildOrder(form, lines) {
  const delivery = form.fulfilment === FULFILMENT.delivery
  const zone = zoneById(form.zone)
  return {
    fulfilment: form.fulfilment,
    items: lines.map((line) => ({ id: line.id, name: line.name, detail: line.detail, priceKsh: line.priceKsh, qty: line.qty })),
    customer: { name: form.name.trim(), phone: normalizePhone(form.phone), email: form.email.trim() },
    address: delivery
      ? { area: zone.label, street: form.street.trim(), landmark: form.landmark.trim(), notes: form.notes.trim() }
      : null,
    payment: form.payment === PAYMENT.mpesa
      ? { method: 'mpesa', reference: normalizeMpesaCode(form.mpesaCode) }
      : { method: 'cash' },
    deliveryFee: deliveryFee(form.fulfilment, form.zone),
  }
}
