import { describe, expect, it } from 'vitest'
import {
  FULFILMENT, PAYMENT, EMPTY_CHECKOUT, buildOrder, deliveryFee, normalizeMpesaCode, normalizePhone, validateCheckout, zoneById,
} from './checkout.js'
import {
  FLOWS, STATUS_LABELS, canCancel, describeStatusLine, flowFor, formatDateTime, isActive, isFinished, isInTransit, stageTimes, stepIndex,
} from './orderStatus.js'
import { mapOrder } from './orders.js'
import { DELIVERY_ZONES } from './shopItems.js'

const lines = [
  { id: 'monstera', name: 'Monstera', detail: '18 cm pot', priceKsh: 1600, qty: 1, category: 'plant' },
  { id: 'potting-soil', name: 'Potting soil', detail: '5 L bag', priceKsh: 350, qty: 2, category: 'media' },
]
const valid = {
  ...EMPTY_CHECKOUT, name: 'Amina Otieno', phone: '0712 345 678', email: 'amina@example.com',
  zone: DELIVERY_ZONES[0].id, street: 'Rose Apartments, Kilimani',
}

describe('phone numbers', () => {
  it('accepts Kenyan mobile numbers in common formats and standardises them', () => {
    for (const input of ['0712345678', '0712 345 678', '+254712345678', '254712345678', '+254 712-345-678', '(0712) 345678', '0112345678']) {
      expect(normalizePhone(input), input).toMatch(/^\+254[17]\d{8}$/)
    }
    expect(normalizePhone('0712 345 678')).toBe('+254712345678')
    expect(normalizePhone('0112345678')).toBe('+254112345678')
  })

  it('rejects numbers that are not Kenyan mobiles', () => {
    for (const input of ['', '12345', '0212345678', '+44 7700 900123', '07123456', '071234567890', 'abc', null, undefined]) {
      expect(normalizePhone(input), String(input)).toBe('')
    }
  })
})

describe('M-PESA codes', () => {
  it('tidies a code typed in any case or with spaces', () => {
    expect(normalizeMpesaCode(' qgh7 abc123 ')).toBe('QGH7ABC123')
    expect(normalizeMpesaCode(undefined)).toBe('')
  })
})

describe('delivery fees', () => {
  it('uses the area\'s fee for delivery, and nothing for collection', () => {
    const zone = DELIVERY_ZONES[1]
    expect(zoneById(zone.id)).toEqual(zone)
    expect(deliveryFee(FULFILMENT.delivery, zone.id)).toBe(zone.feeKsh)
    expect(deliveryFee(FULFILMENT.collection, zone.id)).toBe(0)
    expect(deliveryFee(FULFILMENT.delivery, '')).toBe(0)
    expect(zoneById('nowhere')).toBeNull()
  })
})

describe('validateCheckout', () => {
  it('accepts a complete delivery form', () => {
    expect(validateCheckout(valid)).toEqual({})
  })

  it('asks for the contact details and the address for delivery', () => {
    const errors = validateCheckout({ ...EMPTY_CHECKOUT })
    expect(Object.keys(errors).sort()).toEqual(['name', 'phone', 'street', 'zone'])
    expect(validateCheckout({ ...valid, phone: '12345' }).phone).toMatch(/kenyan mobile number/i)
    expect(validateCheckout({ ...valid, name: 'x'.repeat(61) }).name).toMatch(/under 60/i)
    expect(validateCheckout({ ...valid, street: 'ab' }).street).toBeTruthy()
    expect(validateCheckout({ ...valid, zone: 'moon' }).zone).toBeTruthy()
  })

  it('does not ask for an address when the order is collected', () => {
    expect(validateCheckout({ ...valid, fulfilment: FULFILMENT.collection, zone: '', street: '' })).toEqual({})
  })

  it('checks an M-PESA code only when one is entered', () => {
    expect(validateCheckout({ ...valid, mpesaCode: '' })).toEqual({})
    expect(validateCheckout({ ...valid, mpesaCode: 'qgh7abc123' })).toEqual({})
    expect(validateCheckout({ ...valid, mpesaCode: 'TOO SHORT' }).mpesaCode).toMatch(/10 letters and numbers/i)
    expect(validateCheckout({ ...valid, payment: PAYMENT.cash, mpesaCode: 'nonsense' })).toEqual({})
  })
})

describe('buildOrder', () => {
  it('builds a delivery order with the area, address, fee and M-PESA code', () => {
    const order = buildOrder({ ...valid, landmark: ' Opposite the mall ', notes: ' Call at the gate ', mpesaCode: 'qgh7 abc123' }, lines)
    expect(order).toEqual({
      fulfilment: 'delivery',
      items: [
        { id: 'monstera', name: 'Monstera', detail: '18 cm pot', priceKsh: 1600, qty: 1 },
        { id: 'potting-soil', name: 'Potting soil', detail: '5 L bag', priceKsh: 350, qty: 2 },
      ],
      customer: { name: 'Amina Otieno', phone: '+254712345678', email: 'amina@example.com' },
      address: { area: DELIVERY_ZONES[0].label, street: 'Rose Apartments, Kilimani', landmark: 'Opposite the mall', notes: 'Call at the gate' },
      payment: { method: 'mpesa', reference: 'QGH7ABC123' },
      deliveryFee: DELIVERY_ZONES[0].feeKsh,
    })
  })

  it('builds a collection order with no address, no fee and cash payment', () => {
    const order = buildOrder({ ...valid, fulfilment: FULFILMENT.collection, payment: PAYMENT.cash }, lines)
    expect(order).toMatchObject({ fulfilment: 'collection', address: null, payment: { method: 'cash' }, deliveryFee: 0 })
  })

  it('does not send fields the database does not need', () => {
    const [item] = buildOrder(valid, [{ ...lines[0], category: 'plant', extra: 'x' }]).items
    expect(Object.keys(item).sort()).toEqual(['detail', 'id', 'name', 'priceKsh', 'qty'])
  })
})

describe('order stages', () => {
  const order = (status, fulfilment = 'delivery', extra = {}) => ({ status, fulfilment, events: [], ...extra })

  it('has a labelled step for every status in each flow', () => {
    for (const flow of Object.values(FLOWS)) for (const stage of flow) expect(STATUS_LABELS[stage]).toBeTruthy()
    expect(flowFor(order('placed'))).toEqual(FLOWS.delivery)
    expect(flowFor(order('placed', 'collection'))).toEqual(FLOWS.collection)
  })

  it('finds where an order is on its tracker', () => {
    expect(stepIndex(order('placed'))).toBe(0)
    expect(stepIndex(order('out_for_delivery'))).toBe(3)
    expect(stepIndex(order('delivered'))).toBe(4)
    expect(stepIndex(order('ready_for_collection', 'collection'))).toBe(2)
    expect(stepIndex(order('cancelled'))).toBe(-1)
    expect(stepIndex(order('out_for_delivery', 'collection'))).toBe(-1)
  })

  it('knows which orders are still in progress, in transit or can be cancelled', () => {
    expect(['placed', 'confirmed', 'packed', 'out_for_delivery', 'ready_for_collection'].every((status) => isActive(order(status)))).toBe(true)
    expect(['delivered', 'collected', 'cancelled'].every((status) => isFinished(order(status)))).toBe(true)
    expect(isInTransit(order('out_for_delivery'))).toBe(true)
    expect(isInTransit(order('packed'))).toBe(false)
    expect(['placed', 'confirmed'].every((status) => canCancel(order(status)))).toBe(true)
    expect(['packed', 'out_for_delivery', 'delivered', 'cancelled'].some((status) => canCancel(order(status)))).toBe(false)
  })

  it('takes the time of each stage from the history, using the first time it was reached', () => {
    const times = stageTimes(order('packed', 'delivery', {
      events: [
        { status: 'placed', createdAt: '2026-10-02T08:00:00Z' },
        { status: 'confirmed', createdAt: '2026-10-02T09:00:00Z' },
        { status: 'confirmed', createdAt: '2026-10-02T09:30:00Z' },
      ],
    }))
    expect(times).toEqual({ placed: '2026-10-02T08:00:00Z', confirmed: '2026-10-02T09:00:00Z' })
  })

  it('describes the order in plain words', () => {
    expect(describeStatusLine(order('out_for_delivery', 'delivery', { rider: { name: 'Joseph' } }))).toBe('Joseph is bringing your order')
    expect(describeStatusLine(order('out_for_delivery'))).toMatch(/on its way/i)
    expect(describeStatusLine(order('delivered'))).toMatch(/delivered/i)
  })

  it('formats times, and copes with a bad one', () => {
    expect(formatDateTime('2026-10-02T12:30:00Z')).toMatch(/\d/)
    expect(formatDateTime('not a date')).toBe('')
  })
})

describe('mapOrder', () => {
  it('turns a database row and its history into the shape the screens use', () => {
    const order = mapOrder({
      id: 'o1', tracking_code: 'PCN-ABC234', status: 'out_for_delivery', fulfilment: 'delivery', items: [{ id: 'a' }],
      subtotal_ksh: 2300, delivery_fee_ksh: 300, total_ksh: 2600, customer: { name: 'A' }, address: { street: 's' },
      payment: { method: 'cash' }, rider: { name: 'Joseph' }, eta: '2026-10-02T12:00:00Z', note: 'On the way',
      created_at: '2026-10-02T08:00:00Z', updated_at: '2026-10-02T10:00:00Z',
    }, [{ id: 1, status: 'placed', note: null, created_at: '2026-10-02T08:00:00Z' }])
    expect(order).toMatchObject({
      id: 'o1', code: 'PCN-ABC234', status: 'out_for_delivery', totalKsh: 2600, deliveryFeeKsh: 300, subtotalKsh: 2300,
      rider: { name: 'Joseph' }, note: 'On the way', events: [{ id: 1, status: 'placed', note: '', createdAt: '2026-10-02T08:00:00Z' }],
    })
  })

  it('fills in sensible defaults for missing values', () => {
    const order = mapOrder({ id: 'o2', tracking_code: 'PCN-ZZZ999', status: 'placed', fulfilment: 'collection', created_at: 'x' })
    expect(order).toMatchObject({ items: [], address: null, rider: null, eta: null, note: '', totalKsh: 0, events: [] })
  })
})
