import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PlantShop from './PlantShop.jsx'
import App from './App.jsx'
import { MPESA, SHOP_CATEGORIES, SHOP_ITEMS, formatKsh, formatUsd, usdFromKsh } from './shopItems.js'

function shopGrid() {
  return screen.getByRole('list', { name: 'Items for sale' })
}

function cardFor(name) {
  return within(shopGrid()).getByText(name).closest('li')
}

function item(name) {
  return SHOP_ITEMS.find((entry) => entry.name === name)
}

describe('PlantShop', () => {
  it('lists every item with its name and price in KSh and dollars', () => {
    render(<PlantShop />)
    expect(within(shopGrid()).getAllByRole('listitem')).toHaveLength(SHOP_ITEMS.length)
    expect(screen.getByText(`${SHOP_ITEMS.length} items for sale`)).toBeInTheDocument()
    for (const entry of SHOP_ITEMS) {
      const card = cardFor(entry.name)
      expect(within(card).getByText(formatKsh(entry.priceKsh))).toBeInTheDocument()
      expect(within(card).getByText(formatUsd(usdFromKsh(entry.priceKsh)))).toBeInTheDocument()
      const label = SHOP_CATEGORIES.find((group) => group.id === entry.category).label
      expect(within(card).getByText(label)).toBeInTheDocument()
    }
  })

  it('filters by category', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.selectOptions(screen.getByLabelText('Category'), 'pot')
    const pots = SHOP_ITEMS.filter((entry) => entry.category === 'pot')
    expect(within(shopGrid()).getAllByRole('listitem')).toHaveLength(pots.length)
    expect(screen.getByText(`Showing ${pots.length} of ${SHOP_ITEMS.length} items`)).toBeInTheDocument()
    expect(screen.queryByText('Moth Orchid')).not.toBeInTheDocument()
  })

  it('searches names and sizes', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.type(screen.getByLabelText('Search the shop'), 'orchid')
    expect(cardFor('Moth Orchid')).toBeInTheDocument()
    expect(screen.queryByText('Calathea')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Search the shop'))
    await user.type(screen.getByLabelText('Search the shop'), 'hanging')
    expect(screen.getByText('Showing 2 of 24 items')).toBeInTheDocument()
    expect(cardFor('Golden Pothos')).toBeInTheDocument()
    expect(cardFor('Hanging planter')).toBeInTheDocument()
  })

  it('shows an empty state and clears the filters', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.type(screen.getByLabelText('Search the shop'), 'zzzz-no-match')
    const empty = screen.getByText('No items match your search.')
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText(`${SHOP_ITEMS.length} items for sale`)).toBeInTheDocument()
    expect(within(shopGrid()).getAllByRole('listitem')).toHaveLength(SHOP_ITEMS.length)
  })

  it('adds items to the basket with totals in both currencies', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(cardFor('Snake Plant')).getByRole('button', { name: 'Add Snake Plant to basket' }))
    await user.click(within(cardFor('Moth Orchid')).getByRole('button', { name: 'Add Moth Orchid to basket' }))

    const basket = screen.getByRole('region', { name: /your basket/i })
    expect(within(basket).getByText('2 items')).toBeInTheDocument()
    const firstTotal = item('Snake Plant').priceKsh + item('Moth Orchid').priceKsh
    expect(within(basket).getByText(formatKsh(firstTotal))).toBeInTheDocument()
    expect(within(basket).getByText(`about ${formatUsd(usdFromKsh(firstTotal))}`)).toBeInTheDocument()

    await user.click(within(basket).getByRole('button', { name: 'Add one Snake Plant' }))
    const withQty = item('Snake Plant').priceKsh * 2 + item('Moth Orchid').priceKsh
    expect(within(basket).getByText('3 items')).toBeInTheDocument()
    expect(within(basket).getByText(formatKsh(withQty))).toBeInTheDocument()

    await user.click(within(basket).getByRole('button', { name: 'Place order' }))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('3 items')
    expect(status).toHaveTextContent(formatKsh(withQty))
    expect(status).toHaveTextContent(formatUsd(usdFromKsh(withQty)))
    expect(screen.queryByRole('region', { name: /your basket/i })).not.toBeInTheDocument()
  })

  it('offers M-PESA payment with a till number', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    expect(screen.getByText(/pay by M-PESA \(Buy Goods till/i)).toBeInTheDocument()
    await user.click(within(cardFor('Peace Lily')).getByRole('button', { name: 'Add Peace Lily to basket' }))
    const basket = screen.getByRole('region', { name: /your basket/i })
    expect(within(basket).getByText(/Pay with/)).toBeInTheDocument()
    expect(within(basket).getByText(MPESA.provider)).toBeInTheDocument()
    expect(within(basket).getByText(MPESA.till)).toBeInTheDocument()
  })

  it('repeats the M-PESA till number in the order confirmation', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(cardFor('Terracotta pot')).getByRole('button', { name: 'Add Terracotta pot to basket' }))
    await user.click(screen.getByRole('button', { name: 'Place order' }))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(`Pay ${MPESA.provider} to ${MPESA.method} till ${MPESA.till}`)
    expect(status).toHaveTextContent('cash on collection or delivery')
  })

  it('removes a whole line from the basket', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(cardFor('Calathea')).getByRole('button', { name: 'Add Calathea to basket' }))
    expect(screen.getByRole('region', { name: /your basket/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Calathea from basket' }))
    expect(screen.queryByRole('region', { name: /your basket/i })).not.toBeInTheDocument()
    expect(within(cardFor('Calathea')).getByRole('button', { name: 'Add Calathea to basket' })).toBeInTheDocument()
  })

  it('appears in the app with a Shop navigation link', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '#shop')
    expect(screen.getByRole('region', { name: /buy plants, media and pots/i })).toBeInTheDocument()
  })
})