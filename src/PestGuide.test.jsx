import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PestGuide from './PestGuide.jsx'
import { PROBLEMS } from './pestsAndDiseases.js'

function guideRows() {
  const table = screen.getByRole('table')
  return within(table).getAllByRole('row').slice(1)
}

describe('PestGuide', () => {
  it('lists every problem in one table', () => {
    render(<PestGuide />)
    expect(guideRows()).toHaveLength(PROBLEMS.length)
    expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent))
      .toEqual(PROBLEMS.map((problem) => problem.name))
    expect(screen.getByText(`${PROBLEMS.length} problems in the guide`)).toBeInTheDocument()
  })

  it('filters by type', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    await user.selectOptions(screen.getByLabelText('Type'), 'pest')
    const pests = PROBLEMS.filter((problem) => problem.kind === 'pest')
    expect(guideRows()).toHaveLength(pests.length)
    expect(screen.getByRole('rowheader', { name: 'Spider mites' })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'Root rot' })).not.toBeInTheDocument()
    expect(screen.getByText(`Showing ${pests.length} of ${PROBLEMS.length} problems`)).toBeInTheDocument()
  })

  it('filters by sign', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    const sign = 'Fine webbing on leaves'
    await user.selectOptions(screen.getByLabelText('Sign'), sign)
    const matching = PROBLEMS.filter((problem) => problem.signs.includes(sign))
    expect(matching.length).toBeGreaterThan(0)
    expect(guideRows()).toHaveLength(matching.length)
    for (const problem of matching) {
      expect(screen.getByRole('rowheader', { name: problem.name })).toBeInTheDocument()
    }
  })

  it('searches names, descriptions and signs', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    await user.type(screen.getByLabelText('Search the guide'), 'mealy')
    expect(screen.getByRole('rowheader', { name: 'Mealybugs' })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'Aphids' })).not.toBeInTheDocument()
  })

  it('shows an empty state and clears filters', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    await user.type(screen.getByLabelText('Search the guide'), 'zzzz-no-match')
    const empty = screen.getByText('No problems match your filters.').closest('td')
    expect(empty).toBeInTheDocument()
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText(`${PROBLEMS.length} problems in the guide`)).toBeInTheDocument()
    expect(guideRows()).toHaveLength(PROBLEMS.length)
  })

  it('expands a management plan from its row', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    const row = screen.getByRole('rowheader', { name: 'Spider mites' }).closest('tr')
    const toggle = within(row).getByRole('button', { name: 'View plan' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByText('Management plan: Spider mites')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent('Hide plan')
    await user.click(toggle)
    expect(screen.queryByText('Management plan: Spider mites')).not.toBeInTheDocument()
  })
})