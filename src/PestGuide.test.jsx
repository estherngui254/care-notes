import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PestGuide from './PestGuide.jsx'
import { KIND_GROUPS, PROBLEMS } from './pestsAndDiseases.js'

function sections() {
  return [...document.querySelectorAll('.guide-section')]
}

function sectionFor(title) {
  return sections().find((section) => section.querySelector('.guide-section-title')?.textContent === title)
}

function visibleRowHeaders() {
  return screen.getAllByRole('rowheader').map((cell) => cell.textContent)
}

describe('PestGuide', () => {
  it('groups every problem into four collapsed section dropdowns', () => {
    render(<PestGuide />)
    expect(sections()).toHaveLength(KIND_GROUPS.length)
    for (const section of sections()) expect(section).not.toHaveAttribute('open')
    const expected = KIND_GROUPS.flatMap(({ kind }) => PROBLEMS.filter((problem) => problem.kind === kind))
    expect(visibleRowHeaders()).toEqual(expected.map((problem) => problem.name))
    expect(screen.getByText(`${PROBLEMS.length} problems in the guide`)).toBeInTheDocument()
    for (const { kind, title } of KIND_GROUPS) {
      const count = PROBLEMS.filter((problem) => problem.kind === kind).length
      expect(sectionFor(title).querySelector('.guide-section-count').textContent)
        .toContain(`${count} ${count === 1 ? 'problem' : 'problems'}`)
    }
  })

  it('opens and closes a section from its dropdown', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    const pests = sectionFor('Pests')
    expect(pests).not.toHaveAttribute('open')
    await user.click(pests.querySelector('summary'))
    expect(pests).toHaveAttribute('open')
    expect(within(pests).getByRole('rowheader', { name: 'Spider mites' })).toBeInTheDocument()
    await user.click(pests.querySelector('summary'))
    expect(pests).not.toHaveAttribute('open')
  })

  it('filters by sign and opens only the sections with matches', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PestGuide />)
    const sign = 'Fine webbing on leaves'
    await user.selectOptions(screen.getByLabelText('Sign'), sign)
    const matching = PROBLEMS.filter((problem) => problem.signs.includes(sign))
    expect(matching.length).toBeGreaterThan(0)
    expect(visibleRowHeaders()).toEqual(matching.map((problem) => problem.name))
    expect(screen.getByText(`Showing ${matching.length} of ${PROBLEMS.length} problems`)).toBeInTheDocument()
    const shownTitles = new Set(matching.map((problem) => KIND_GROUPS.find((group) => group.kind === problem.kind).title))
    expect(sections()).toHaveLength(shownTitles.size)
    for (const section of sections()) expect(section).toHaveAttribute('open')
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
    const empty = screen.getByText('No problems match your filters.')
    expect(empty).toBeInTheDocument()
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText(`${PROBLEMS.length} problems in the guide`)).toBeInTheDocument()
    expect(sections()).toHaveLength(KIND_GROUPS.length)
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