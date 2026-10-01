import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

function setup() {
  return { user: userEvent.setup({ applyAccept: false }), ...render(<App />) }
}

async function addFern(user) {
  await user.type(screen.getByLabelText(/plant name/i), 'Fern')
  await user.type(screen.getByLabelText(/other care/i), 'Mist daily')
  await user.click(screen.getByRole('button', { name: /save plant/i }))
}

async function openReportForm(user) {
  await user.click(screen.getByText(/^plant health/i))
  await user.click(screen.getByRole('button', { name: /report a problem/i }))
  return screen.getByRole('form', { name: /report a problem on fern/i })
}

async function chooseSymptoms(user, form, symptoms) {
  await user.click(within(form).getByRole('button', { name: /what do you see/i }))
  for (const symptom of symptoms) await user.click(within(form).getByLabelText(symptom))
  await user.keyboard('{Escape}')
}

describe('plant health section', () => {
  it('shows an empty message and a guide', async () => {
    const { user } = setup()
    await addFern(user)
    expect(screen.getByText(/no problems recorded for this plant/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pest, disease and nutrient guide/i })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Spider mites' })).toBeInTheDocument()
  })

  it('suggests matches from the chosen symptoms and records the problem', async () => {
    const { user } = setup()
    await addFern(user)
    const form = await openReportForm(user)
    await chooseSymptoms(user, form, ['Cottony white clumps', 'Sticky residue on leaves'])

    const matches = within(form).getByRole('region', { name: /possible matches/i })
    expect(within(matches).getAllByRole('listitem')[0]).toHaveTextContent('Mealybugs')

    await user.click(within(matches).getByRole('button', { name: /use mealybugs/i }))
    expect(within(form).getByLabelText('Suspected problem')).toHaveValue('Mealybugs')
    await user.type(within(form).getByLabelText(/notes/i), 'Under the lowest leaves')
    await user.click(within(form).getByRole('button', { name: /save problem/i }))

    const list = screen.getByRole('list', { name: /problems on fern/i })
    expect(within(list).getByText('Mealybugs')).toBeInTheDocument()
    expect(within(list).getByText('Open')).toBeInTheDocument()
    expect(within(list).getByText('Under the lowest leaves')).toBeInTheDocument()
    expect(within(list).getByText(/dab each insect/i)).toBeInTheDocument()
    expect(screen.getByText(/plant health \(1 open\)/i)).toBeInTheDocument()
  })

  it('refuses an empty report', async () => {
    const { user } = setup()
    await addFern(user)
    const form = await openReportForm(user)
    await user.click(within(form).getByRole('button', { name: /save problem/i }))
    expect(within(form).getByText(/add a photo, choose a symptom/i)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /problems on fern/i })).not.toBeInTheDocument()
  })

  it('rejects a problem photo that is not an image', async () => {
    const { user } = setup()
    await addFern(user)
    const form = await openReportForm(user)
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    await user.upload(within(form).getByLabelText(/photo of the affected plant or pest/i), file)
    expect(await within(form).findByText(/choose a jpeg, png or webp/i)).toBeInTheDocument()
  })

  it('marks a problem resolved, reopens it and deletes it', async () => {
    const { user } = setup()
    await addFern(user)
    const form = await openReportForm(user)
    await user.selectOptions(within(form).getByLabelText('Suspected problem'), 'Root rot')
    await user.click(within(form).getByRole('button', { name: /save problem/i }))

    const list = screen.getByRole('list', { name: /problems on fern/i })
    expect(within(list).getByText(/take the plant out of its pot/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /mark resolved/i }))
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(within(list).queryByText(/take the plant out of its pot/i)).not.toBeInTheDocument()
    expect(screen.getByText(/^plant health$/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /reopen/i }))
    expect(screen.getByText('Open')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete problem/i }))
    expect(screen.queryByRole('list', { name: /problems on fern/i })).not.toBeInTheDocument()
  })

  it('keeps problems after a remount and when the plant is edited', async () => {
    const { user, unmount } = setup()
    await addFern(user)
    const form = await openReportForm(user)
    await user.selectOptions(within(form).getByLabelText('Suspected problem'), 'Aphids')
    await user.click(within(form).getByRole('button', { name: /save problem/i }))

    await user.click(screen.getByRole('button', { name: 'Edit Fern' }))
    await user.type(screen.getByLabelText(/plant name/i), ' Two')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.getByText(/plant health \(1 open\)/i)).toBeInTheDocument()

    unmount()
    render(<App />)
    expect(screen.getByText(/plant health \(1 open\)/i)).toBeInTheDocument()
  })
})
