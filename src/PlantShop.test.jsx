import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PlantShop from './PlantShop.jsx'
import App from './App.jsx'
import { fakeSupabase } from './test/fakeSupabase.js'
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

    // Checkout opens a form with the same total, and can be left without losing the basket.
    await user.click(within(basket).getByRole('button', { name: 'Checkout' }))
    const summary = within(screen.getByRole('form', { name: 'Checkout' })).getByRole('group', { name: 'Order summary' })
    expect(within(summary).getByText(formatUsd(usdFromKsh(withQty)), { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to basket' }))
    expect(screen.queryByRole('form', { name: 'Checkout' })).not.toBeInTheDocument()
    expect(within(basket).getByText('3 items')).toBeInTheDocument()
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

  it('shows the M-PESA till number again at checkout', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(rowFor('Terracotta pot')).getByRole('button', { name: 'Add Terracotta pot to basket' }))
    await user.click(screen.getByRole('button', { name: 'Checkout' }))
    const form = screen.getByRole('form', { name: 'Checkout' })
    expect(within(form).getByLabelText(new RegExp(`${MPESA.provider} \\(${MPESA.method} till ${MPESA.till}\\)`))).toBeChecked()
    expect(form).toHaveTextContent(`till number ${MPESA.till}`)
    expect(form).toHaveTextContent('Nothing is charged from this site')
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

  it('shows an item the shop flagged as out of stock, with its note, and will not add it', async () => {
    fakeSupabase.setStock('monstera', false, 'Back on Friday')
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)

    const row = await within(document.querySelector('.shop-groups')).findByRole('rowheader', { name: /Monstera/ })
      .then((cell) => cell.closest('tr'))
    expect(within(row).getByText('Out of stock')).toBeInTheDocument()
    expect(within(row).getByText('Back on Friday')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /add monstera to basket/i })).not.toBeInTheDocument()

    // everything else is untouched
    expect(within(rowFor('Snake Plant')).getByRole('button', { name: 'Add Snake Plant to basket' })).toBeEnabled()
    await user.click(within(rowFor('Snake Plant')).getByRole('button', { name: 'Add Snake Plant to basket' }))
    expect(screen.getByRole('region', { name: /your basket/i })).toBeInTheDocument()
  })

  it('puts an item back on sale when the shop flags it in stock again', async () => {
    fakeSupabase.setStock('peace-lily', false)
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await within(document.querySelector('.shop-groups')).findByRole('rowheader', { name: /Peace Lily/ })
    expect(within(rowFor('Peace Lily')).getByText('Out of stock')).toBeInTheDocument()
    expect(within(rowFor('Peace Lily')).getByText('Ask the shop')).toBeInTheDocument()

    // The shop has more Peace Lilies. Stock can change while the page is open, so "Check stock"
    // picks it up without a reload, and the item can be added again.
    fakeSupabase.setStock('peace-lily', true)
    expect(within(rowFor('Peace Lily')).getByText('Out of stock')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /check stock/i }))
    await waitFor(() => expect(within(rowFor('Peace Lily')).queryByText('Out of stock')).not.toBeInTheDocument())
    const row = rowFor('Peace Lily')
    expect(within(row).getByRole('button', { name: 'Add Peace Lily to basket' })).toBeEnabled()
    await user.click(within(row).getByRole('button', { name: 'Add Peace Lily to basket' }))
    await user.click(screen.getByRole('button', { name: 'Checkout' }))
    expect(screen.getByRole('form', { name: 'Checkout' })).toBeInTheDocument()
  })

  it('will not let an order be placed when something in the basket went out of stock', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)
    await user.click(within(rowFor('Moth Orchid')).getByRole('button', { name: 'Add Moth Orchid to basket' }))
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument()

    // the shop sells the last one while this basket is open
    fakeSupabase.setStock('moth-orchid', false, 'Sold out for now')
    await user.click(screen.getByRole('button', { name: 'Checkout' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Moth Orchid is out of stock')
    expect(screen.queryByRole('form', { name: 'Checkout' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Checkout' })).not.toBeInTheDocument()

    // removing it clears the way again
    await user.click(screen.getByRole('button', { name: 'Remove Moth Orchid from basket' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the shop usable, with a quiet note, before the stock table is set up', async () => {
    fakeSupabase.state.stockMissing = true
    const user = userEvent.setup({ applyAccept: false })
    render(<PlantShop />)

    expect(await screen.findByText(/supabase\/shop-stock\.sql/)).toBeInTheDocument()
    expect(rowHeaders()).toHaveLength(SHOP_ITEMS.length)
    await user.click(within(rowFor('Calathea')).getByRole('button', { name: 'Add Calathea to basket' }))
    expect(screen.getByRole('region', { name: /your basket/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument()
    // nothing was checked, so there is nothing to refresh
    expect(screen.queryByRole('button', { name: /check stock/i })).not.toBeInTheDocument()
  })

  it('says when stock was last checked, so a stale answer is obvious', async () => {
    render(<PlantShop />)
    const check = await screen.findByRole('button', { name: /check stock/i })
    expect(check).toHaveTextContent(/checked/i)
    // nothing is flagged in this test, so every item is still orderable
    expect(rowFor('Calathea')).not.toHaveTextContent('Out of stock')
  })
})