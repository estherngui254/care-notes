import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { buildBackup } from './storage.js'
import { toDateString } from './plantUtils.js'

function daysAgo(count) {
  const date = new Date()
  date.setDate(date.getDate() - count)
  return toDateString(date)
}

function setup() {
  return { user: userEvent.setup({ applyAccept: false }), ...render(<App />) }
}

async function addPlant(user, { name, note = 'Some care', lastWatered, every }) {
  await user.type(screen.getByLabelText(/plant name/i), name)
  await user.type(screen.getByLabelText(/other care/i), note)
  if (lastWatered) fireEvent.change(screen.getByLabelText(/last watered/i), { target: { value: lastWatered } })
  if (every) await user.type(screen.getByLabelText(/water every/i), String(every))
  await user.click(screen.getByRole('button', { name: /save plant/i }))
}

const plantNames = () => within(screen.getByRole('list', { name: /your plants/i }))
  .getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)

describe('watering schedule', () => {
  it('shows days since watered and flags overdue plants', async () => {
    const { user } = setup()
    await addPlant(user, { name: 'Fern', lastWatered: daysAgo(10), every: 7 })
    const list = screen.getByRole('list', { name: /your plants/i })
    expect(within(list).getByText('Overdue by 3 days')).toBeInTheDocument()
    const due = screen.getByRole('region', { name: /needs water/i })
    expect(within(due).getByText('Fern')).toBeInTheDocument()
  })

  it('shows days since watering when there is no schedule', async () => {
    const { user } = setup()
    await addPlant(user, { name: 'Cactus', lastWatered: daysAgo(4) })
    expect(screen.getByText('Watered 4 days ago')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /needs water/i })).not.toBeInTheDocument()
  })

  it('rejects an invalid watering interval', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText(/plant name/i), 'Fern')
    await user.type(screen.getByLabelText(/other care/i), 'Mist')
    await user.type(screen.getByLabelText(/water every/i), '0')
    await user.click(screen.getByRole('button', { name: /save plant/i }))
    expect(screen.getByText(/whole number of days/i)).toBeInTheDocument()
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
  })

  it('keeps the schedule after a remount', async () => {
    const { user, unmount } = setup()
    await addPlant(user, { name: 'Fern', lastWatered: daysAgo(1), every: 7 })
    unmount()
    render(<App />)
    expect(screen.getByText('Next watering in 6 days')).toBeInTheDocument()
  })
})

describe('search, filter and sort', () => {
  async function addThree(user) {
    await addPlant(user, { name: 'Zebra Plant', note: 'Humid air' })
    await addPlant(user, { name: 'Aloe', note: 'Sunny spot' })
    await addPlant(user, { name: 'Monstera', note: 'Wipe leaves' })
  }

  it('searches by name and care note and can be cleared', async () => {
    const { user } = setup()
    await addThree(user)
    await user.type(screen.getByLabelText('Search'), 'sunny')
    expect(plantNames()).toEqual(['Aloe'])
    expect(screen.getByText('1 of 3')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Search'))
    await user.type(screen.getByLabelText('Search'), 'nothing matches this')
    expect(screen.getByText(/no plants match/i)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /clear filters/i })[0])
    expect(plantNames()).toHaveLength(3)
  })

  it('sorts by name and by newest first', async () => {
    const { user } = setup()
    await addThree(user)
    expect(plantNames()).toEqual(['Monstera', 'Aloe', 'Zebra Plant'])
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'name')
    expect(plantNames()).toEqual(['Aloe', 'Monstera', 'Zebra Plant'])
  })

  it('filters by recommendation', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText(/plant name/i), 'Sunny')
    await user.click(screen.getByRole('button', { name: /care note/i }))
    await user.click(screen.getByLabelText('Water weekly'))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /save plant/i }))
    await addPlant(user, { name: 'Other' })
    await user.selectOptions(screen.getByLabelText(/^recommendation$/i), 'Water weekly')
    expect(plantNames()).toEqual(['Sunny'])
  })
})

describe('undo delete', () => {
  it('restores a deleted plant', async () => {
    const { user } = setup()
    await addPlant(user, { name: 'Fern' })
    await user.click(screen.getByRole('button', { name: 'Delete Fern' }))
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
    expect(screen.getByText(/deleted fern/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(plantNames()).toEqual(['Fern'])
  })
})

describe('backup', () => {
  it('imports plants from a backup file and skips duplicates', async () => {
    const { user } = setup()
    const backup = buildBackup([
      { id: 'imp-1', name: 'Imported Fern', careNote: 'Mist', recommendations: [] },
      { id: 'imp-2', name: 'Imported Aloe', careNote: 'Sun', recommendations: ['Water weekly'] },
    ])
    const file = new File([backup], 'backup.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Import backup file'), file)
    expect(await screen.findByText(/imported 2 plants/i)).toBeInTheDocument()
    expect(plantNames().sort()).toEqual(['Imported Aloe', 'Imported Fern'])

    await user.upload(screen.getByLabelText('Import backup file'), file)
    expect(await screen.findByText(/imported 0 plants\. 2 already saved/i)).toBeInTheDocument()
  })

  it('rejects a file that is not a backup', async () => {
    const { user } = setup()
    const file = new File(['not json'], 'bad.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Import backup file'), file)
    expect(await screen.findByText(/not valid json/i)).toBeInTheDocument()
  })

  it('disables export when there is nothing to export', () => {
    setup()
    expect(screen.getByRole('button', { name: /export plants/i })).toBeDisabled()
  })
})

describe('photo', () => {
  it('rejects a file that is not an image', async () => {
    const { user } = setup()
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    await user.upload(screen.getByLabelText(/^photo$/i), file)
    expect(await screen.findByText(/choose a jpeg, png or webp/i)).toBeInTheDocument()
  })
})

describe('theme', () => {
  it('toggles dark mode and remembers it', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /dark mode/i }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('plant-care-notes-theme')).toBe('dark')
    await user.click(screen.getByRole('button', { name: /light mode/i }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
