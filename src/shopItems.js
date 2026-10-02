// The plant shop catalogue: indoor ornamental plants and flowers, plant media and pots.
// Prices are stored in Kenyan shillings; the dollar price is derived from a fixed
// indicative rate so the two currencies can never drift apart.
export const KSH_PER_USD = 129.28

// The payment method offered at checkout: M-PESA Buy Goods (Lipa na M-PESA).
// The till number below is a random sample for the demo — replace it with the
// shop's real Buy Goods till before taking live orders.
export const MPESA = {
  provider: 'M-PESA',
  method: 'Buy Goods',
  till: '296741',
}

// Where orders can be delivered and what delivery costs there. These areas and fees are SAMPLES for
// the demo: replace them with the shop's real delivery areas and prices before taking live orders.
export const DELIVERY_ZONES = [
  { id: 'nairobi-central', label: 'Nairobi CBD, Westlands, Kilimani, Lavington', feeKsh: 300 },
  { id: 'nairobi-other', label: 'Other parts of Nairobi', feeKsh: 450 },
  { id: 'nairobi-environs', label: 'Kiambu, Ruiru, Kitengela, Rongai, Ngong', feeKsh: 700 },
  { id: 'other-town', label: 'Other towns (sent by courier)', feeKsh: 1000 },
]

// Where customers pick up an order they chose to collect. Also a SAMPLE: set the real address.
export const COLLECTION_POINT = {
  name: 'Plant Care shop',
  address: 'Set the shop address in src/shopItems.js',
  hours: 'Monday to Saturday, 9 am to 5 pm',
}

export const SHOP_CATEGORIES = [
  { id: 'plant', label: 'Indoor plants and flowers' },
  { id: 'media', label: 'Plant media' },
  { id: 'pot', label: 'Pots and planters' },
]

export const SHOP_ITEMS = [
  { id: 'monstera', name: 'Monstera', category: 'plant', detail: '18 cm pot, about 60 cm tall', priceKsh: 1600 },
  { id: 'snake-plant', name: 'Snake Plant', category: 'plant', detail: '15 cm pot, about 40 cm tall', priceKsh: 850 },
  { id: 'peace-lily', name: 'Peace Lily', category: 'plant', detail: '16 cm pot, in bloom', priceKsh: 950 },
  { id: 'zz-plant', name: 'ZZ Plant', category: 'plant', detail: '16 cm pot, glossy leaves', priceKsh: 1400 },
  { id: 'areca-palm', name: 'Areca Palm', category: 'plant', detail: '20 cm pot, about 80 cm tall', priceKsh: 1200 },
  { id: 'calathea', name: 'Calathea', category: 'plant', detail: '14 cm pot, patterned leaves', priceKsh: 750 },
  { id: 'golden-pothos', name: 'Golden Pothos', category: 'plant', detail: '12 cm hanging pot, trailing', priceKsh: 600 },
  { id: 'moth-orchid', name: 'Moth Orchid', category: 'plant', detail: 'Double stem, 15 cm pot', priceKsh: 1800 },
  { id: 'african-violet', name: 'African Violet', category: 'plant', detail: '12 cm pot, flowering size', priceKsh: 500 },
  { id: 'anthurium', name: 'Anthurium', category: 'plant', detail: '16 cm pot, red spathes', priceKsh: 1500 },
  { id: 'maidenhair-fern', name: 'Maidenhair Fern', category: 'plant', detail: '16 cm pot, soft fronds', priceKsh: 650 },
  { id: 'bird-of-paradise', name: 'Bird of Paradise', category: 'plant', detail: '20 cm pot, about 90 cm tall', priceKsh: 2500 },

  { id: 'potting-soil', name: 'Potting soil', category: 'media', detail: '5 L bag, free-draining mix', priceKsh: 350 },
  { id: 'coco-peat', name: 'Coco peat', category: 'media', detail: '5 kg block, makes about 15 L', priceKsh: 450 },
  { id: 'garden-compost', name: 'Garden compost', category: 'media', detail: '5 kg bag, organic matter', priceKsh: 400 },
  { id: 'perlite', name: 'Perlite', category: 'media', detail: '2 L bag, keeps soil airy', priceKsh: 550 },
  { id: 'river-sand', name: 'River sand', category: 'media', detail: '5 kg bag, sharp sand', priceKsh: 250 },
  { id: 'hort-charcoal', name: 'Horticultural charcoal', category: 'media', detail: '1 L bag, keeps soil sweet', priceKsh: 600 },

  { id: 'nursery-pot', name: 'Plastic nursery pot', category: 'pot', detail: '15 cm, drainage holes', priceKsh: 150 },
  { id: 'ceramic-planter', name: 'Ceramic planter', category: 'pot', detail: '18 cm, glazed finish', priceKsh: 950 },
  { id: 'terracotta-pot', name: 'Terracotta pot', category: 'pot', detail: '20 cm, classic clay', priceKsh: 650 },
  { id: 'hanging-planter', name: 'Hanging planter', category: 'pot', detail: '20 cm, with hanger', priceKsh: 780 },
  { id: 'self-watering-pot', name: 'Self-watering pot', category: 'pot', detail: '18 cm, with reservoir', priceKsh: 1150 },
  { id: 'basket-cover', name: 'Woven basket cover', category: 'pot', detail: '20 cm, seagrass', priceKsh: 700 },
]

// "KSh 1,250" style formatting that does not depend on the runtime's locale data.
export function formatKsh(amount) {
  return `KSh ${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function usdFromKsh(amount) {
  return Math.round((amount / KSH_PER_USD) * 100) / 100
}

export function formatUsd(amount) {
  return `$${amount.toFixed(2)}`
}