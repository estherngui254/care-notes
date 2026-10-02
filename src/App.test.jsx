import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { fakeSupabase } from './test/fakeSupabase.js'

function setup() {
  return { user: userEvent.setup(), ...render(<App />) }
}

async function addPlant(user, { name, note, recommendations = [] }) {
  await user.type(screen.getByLabelText(/plant name/i), name)
  if (recommendations.length > 0) {
    await user.click(screen.getByRole('button', { name: /care note/i }))
    for (const item of recommendations) await user.click(screen.getByLabelText(item))
    await user.keyboard('{Escape}')
  }
  if (note) await user.type(screen.getByLabelText(/other care/i), note)
  await user.click(screen.getByRole('button', { name: /save plant/i }))
}

describe('Plant Care Notes', () => {
  it('shows the empty state when no plants are saved (check 6)', () => {
    setup()
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first plant/i })).toBeInTheDocument()
  })

  it('focuses the name field from the empty-state button', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /add your first plant/i }))
    expect(screen.getByLabelText(/plant name/i)).toHaveFocus()
  })

  it('saves a plant and shows name and care note (criterion 1)', async () => {
    const { user } = setup()
    await addPlant(user, { name: 'Fern', note: 'Mist daily' })
    const list = screen.getByRole('list', { name: /your plants/i })
    expect(within(list).getByText('Fern')).toBeInTheDocument()
    expect(within(list).getByText('Mist daily')).toBeInTheDocument()
  })

  it('does not save when a required field is blank (criterion 2)', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /save plant/i }))
    expect(screen.getByText(/enter a plant name/i)).toBeInTheDocument()
    expect(screen.getByText(/add a care note/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toHaveFocus()
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/plant name/i), '   ')
    await user.type(screen.getByLabelText(/other care/i), '   ')
    await user.click(screen.getByRole('button', { name: /save plant/i }))
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
  })

  it('accepts recommendations alone as the care note (check 13)', async () => {
    const { user } = setup()
    await addPlant(user, { name: 'Aloe', recommendations: ['Water weekly', 'Bright indirect light'] })
    const list = screen.getByRole('list', { name: /your plants/i })
    expect(within(list).getByText('Water weekly')).toBeInTheDocument()
    expect(within(list).getByText('Bright indirect light')).toBeInTheDocument()
  })

  it('edits a plant and cancels an edit (criterion 3, check 7)', async () => {
    const { user } = setup()
    await addPlant(user, { name: 'Fern', note: 'Mist daily' })
    await user.click(screen.getByRole('button', { name: 'Edit Fern' }))
    const nameBox = screen.getByLabelText(/plant name/i)
    await user.clear(nameBox)
    await user.type(nameBox, 'Boston Fern')
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByText('Fern')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Fern' }))
    await user.clear(screen.getByLabelText(/plant name/i))
    await user.type(screen.getByLabelText(/plant name/i), 'Boston Fern')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.getByText('Boston Fern')).toBeInTheDocument()
  })

  it('persists plants across a remount (criterion 5)', async () => {
    const { user, unmount } = setup()
    await addPlant(user, { name: 'Pothos', note: 'Easy' })
    unmount()
    render(<App />)
    expect(screen.getByText('Pothos')).toBeInTheDocument()
  })

  it('keeps working and says so when saving to the account fails, then recovers (check 9)', async () => {
    const { user } = setup()
    expect(await screen.findByText('Saved to your account.')).toBeInTheDocument()

    fakeSupabase.state.offline = true
    await addPlant(user, { name: 'Offline Fern', note: 'Mist daily' })
    expect(screen.getByText('Offline Fern')).toBeInTheDocument()
    expect(await screen.findByText(/you are offline/i)).toBeInTheDocument()

    fakeSupabase.state.offline = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Saved to your account.')).toBeInTheDocument()
    const [account] = fakeSupabase.state.users
    expect(fakeSupabase.rowsFor(account.id).map((row) => row.data.name)).toEqual(['Offline Fern'])
  })
})
