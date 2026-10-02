import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PlantShop from './PlantShop.jsx'
import App from './App.jsx'
import { MPESA, SHOP_CATEGORIES, SHOP_ITEMS, formatKsh, formatUsd, usdFromKsh } from './shopItems.js'

function groups() {
  return [...document.querySelectorAll('.shop-group')]
}

function groupFor(title) {
  return groups().find((group) => group.querySelector('.shop-group-title')?.textContent === title)
}

function rowHeaders() {
  return screen.getAllByRole('rowheader')
}

function rowFor(name) {
  return within(document.querySelector('.shop-groups')).getByText(name).closest('tr')
}

function item(name) {
  return SHOP_ITEMS.find((entry) => entry.name === name)
}

describe('PlantShop', () => {
  it('lists every item with its name and price in KSh and dollars', () => {
    render(<PlantShop />)
    expect(rowHeaders()).toHaveLength(SHOP_ITEMS.length)
    expect(screen.getByText(`${SHOP_ITEMS.length} items for sale`)).toBeInTheDocument()
    for (const entry of SHOP_ITEMS) {
      const row = rowFor(entry.name)
      expect(within(row).getByText(formatKsh(entry.priceKsh))).toBeInTheDocument()
      expect(within(row).getByText(formatUsd(usdFromKsh(entry.priceKsh)))).toBeInTheDocument()
      const label = SHOP_CATEGORIES.find((group) => group.id === entry.category).label
      expect(within(row).getByText(label)).toBeInTheDocument()
    }
  })

  it('groups the items into three collapsible category dropdowns', () => {
    render(<PlantShop />)
    expect(groups()).toHaveLength(SHOP_CATEGORIES.length)
    for (const group of groups()) expect(group).not.toHaveAttribute('open')
    for (const { id, label } of SHOP_CATEGORIES) {
      const count = SHOP_ITEMS.filter((entry) => entry.category === id).length
      const group = groupFor(label)
      expect(group).toBeInTheDocument()
      expect(group.querySelector('.shop-group-count').textContent)
        .toContain(`${count} ${count === 1 ? 'item' : 'items'}`)
      expect(within(group).getAllByRole('rowheader')).toHaveLength(count)
      expect(screen.getByRole('table', { name: `${label} for sale` })).toBeInTheDocument()
    }
  })

  it('opens and closes a category dropdown', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    const pots = groupFor('Pots and planters')
    expect(pots).not.toHaveAttribute('open')
    await user.click(pots.querySelector('summary'))
    expect(pots).toHaveAttribute('open')
    expect(within(pots).getByRole('rowheader', { name: /Terracotta pot/ })).toBeInTheDocument()
    await user.click(pots.querySelector('summary'))
    expect(pots).not.toHaveAttribute('open')
  })

  it('filters by category', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.selectOptions(screen.getByLabelText('Category'), 'pot')
    const pots = SHOP_ITEMS.filter((entry) => entry.category === 'pot')
    expect(rowHeaders()).toHaveLength(pots.length)
    expect(screen.getByText(`Showing ${pots.length} of ${SHOP_ITEMS.length} items`)).toBeInTheDocument()
    expect(groups()).toHaveLength(1)
    expect(groups()[0]).toHaveAttribute('open')
    expect(screen.queryByText('Moth Orchid')).not.toBeInTheDocument()
  })

  it('searches names and sizes', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.type(screen.getByLabelText('Search the shop'), 'orchid')
    expect(rowFor('Moth Orchid')).toBeInTheDocument()
    expect(screen.queryByText('Calathea')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Search the shop'))
    await user.type(screen.getByLabelText('Search the shop'), 'hanging')
    expect(screen.getByText('Showing 2 of 24 items')).toBeInTheDocument()
    expect(rowFor('Golden Pothos')).toBeInTheDocument()
    expect(rowFor('Hanging planter')).toBeInTheDocument()
  })

  it('shows an empty state and clears the filters', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.type(screen.getByLabelText('Search the shop'), 'zzzz-no-match')
    const empty = screen.getByText('No items match your search.')
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText(`${SHOP_ITEMS.length} items for sale`)).toBeInTheDocument()
    expect(rowHeaders()).toHaveLength(SHOP_ITEMS.length)
  })

  it('adds items to the basket with totals in both currencies', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(rowFor('Snake Plant')).getByRole('button', { name: 'Add Snake Plant to basket' }))
    await user.click(within(rowFor('Moth Orchid')).getByRole('button', { name: 'Add Moth Orchid to basket' }))

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
    await user.click(within(rowFor('Peace Lily')).getByRole('button', { name: 'Add Peace Lily to basket' }))
    const basket = screen.getByRole('region', { name: /your basket/i })
    expect(within(basket).getByText(/Pay with/)).toBeInTheDocument()
    expect(within(basket).getByText(MPESA.provider)).toBeInTheDocument()
    expect(within(basket).getByText(MPESA.till)).toBeInTheDocument()
  })

  it('repeats the M-PESA till number in the order confirmation', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(rowFor('Terracotta pot')).getByRole('button', { name: 'Add Terracotta pot to basket' }))
    await user.click(screen.getByRole('button', { name: 'Place order' }))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(`Pay ${MPESA.provider} to ${MPESA.method} till ${MPESA.till}`)
    expect(status).toHaveTextContent('cash on collection or delivery')
  })

  it('removes a whole line from the basket', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(rowFor('Calathea')).getByRole('button', { name: 'Add Calathea to basket' }))
    expect(screen.getByRole('region', { name: /your basket/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Calathea from basket' }))
    expect(screen.queryByRole('region', { name: /your basket/i })).not.toBeInTheDocument()
    expect(within(rowFor('Calathea')).getByRole('button', { name: 'Add Calathea to basket' })).toBeInTheDocument()
  })

  it('appears in the app with a Shop navigation link', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '#shop')
    expect(screen.getByRole('region', { name: /buy plants, media and pots/i })).toBeInTheDocument()
  })
})