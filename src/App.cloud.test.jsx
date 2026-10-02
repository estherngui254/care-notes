import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { fakeSupabase } from './test/fakeSupabase.js'

const setup = () => ({ user: userEvent.setup({ applyAccept: false }), ...render(<App />) })
const me = () => fakeSupabase.state.users[0]
const names = (rows) => rows.map((row) => row.data.name).sort()
const myNames = () => names(fakeSupabase.rowsFor(me().id))
const SAVED = 'Saved to your account.'

function plant(name, extra = {}) {
  return {
    id: crypto.randomUUID(), name, careNote: 'Water weekly', recommendations: [], lastWatered: '', waterEveryDays: null,
    photo: '', issues: [], careProfile: null, createdAt: new Date().toISOString(), ...extra,
  }
}

function seed(userId, ...plants) {
  for (const item of plants) fakeSupabase.state.rows.push({ user_id: userId, id: item.id, data: item })
  return plants
}

const listNames = () => screen.queryAllByRole('heading', { level: 3 })
  .filter((heading) => heading.closest('.record')).map((heading) => heading.textContent).sort()

async function addPlant(user, name) {
  await user.type(screen.getByLabelText(/plant name/i), name)
  await user.type(screen.getByLabelText(/other care/i), 'Mist daily')
  await user.click(screen.getByRole('button', { name: /save plant/i }))
}

describe('plants live in the account', () => {
  it('loads the signed-in person\'s plants, and never anyone else\'s', async () => {
    const other = fakeSupabase.addUser({ name: 'Brian', email: 'b@example.com', password: 'whatever pass' })
    seed(me().id, plant('Mine One'), plant('Mine Two'))
    seed(other.id, plant('Brians Secret'))
    setup()
    expect(await screen.findByText('Mine One')).toBeInTheDocument()
    expect(listNames()).toEqual(['Mine One', 'Mine Two'])
    expect(screen.queryByText('Brians Secret')).not.toBeInTheDocument()
    expect(await screen.findByText(SAVED)).toBeInTheDocument()
  })

  it('saves a plant that is added, changed and deleted', async () => {
    const { user } = setup()
    await screen.findByText(SAVED)
    await addPlant(user, 'Fern')
    await waitFor(() => expect(myNames()).toEqual(['Fern']))

    await user.click(screen.getByRole('button', { name: 'Edit Fern' }))
    await user.clear(screen.getByLabelText(/plant name/i))
    await user.type(screen.getByLabelText(/plant name/i), 'Boston Fern')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(myNames()).toEqual(['Boston Fern']))
    expect(fakeSupabase.rowsFor(me().id)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Delete Boston Fern' }))
    await waitFor(() => expect(fakeSupabase.rowsFor(me().id)).toHaveLength(0))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(myNames()).toEqual(['Boston Fern']))
  })

  it('stores each plant under the signed-in person only', async () => {
    const { user } = setup()
    await screen.findByText(SAVED)
    await addPlant(user, 'Fern')
    await waitFor(() => expect(fakeSupabase.state.rows).toHaveLength(1))
    expect(fakeSupabase.state.rows[0].user_id).toBe(me().id)
    expect(fakeSupabase.state.rows[0].data.name).toBe('Fern')
  })

  it('keeps a plant added before the first load from the account has finished', async () => {
    seed(me().id, plant('Already There'))
    fakeSupabase.state.selectDelay = 700
    const { user } = setup()
    await addPlant(user, 'Quick Fern')
    expect(await screen.findByText('Already There', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(listNames()).toEqual(['Already There', 'Quick Fern'])
    await waitFor(() => expect(myNames()).toEqual(['Already There', 'Quick Fern']), { timeout: 3000 })
  })

  it('shows the plants from this device straight away and flags that it is offline', async () => {
    seed(me().id, plant('Cached Fern'))
    const first = setup()
    await screen.findByText('Cached Fern')
    await screen.findByText(SAVED)
    first.unmount()

    fakeSupabase.state.offline = true
    setup()
    expect(screen.getByText('Cached Fern')).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.hero-account')).toHaveTextContent(/you are offline/i))
    expect(within(document.querySelector('.hero-account')).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('sends changes made offline when the connection returns, including deletions', async () => {
    const [a, b] = seed(me().id, plant('Plant A'), plant('Plant B'))
    const first = setup()
    await screen.findByText('Plant A')
    await screen.findByText(SAVED)

    fakeSupabase.state.offline = true
    await first.user.click(screen.getByRole('button', { name: 'Delete Plant A' }))
    await addPlant(first.user, 'Plant C')
    await screen.findByText(/you are offline/i)
    first.unmount()

    fakeSupabase.state.offline = false
    setup()
    expect(await screen.findByText(SAVED)).toBeInTheDocument()
    await waitFor(() => expect(myNames()).toEqual(['Plant B', 'Plant C']))
    expect(fakeSupabase.rowsFor(me().id).some((row) => row.id === a.id)).toBe(false)
    expect(fakeSupabase.rowsFor(me().id).some((row) => row.id === b.id)).toBe(true)
    expect(listNames()).toEqual(['Plant B', 'Plant C'])
  })

  it('keeps edits made offline over the account\'s older copy', async () => {
    const [original] = seed(me().id, plant('Old Name'))
    const first = setup()
    await screen.findByText('Old Name')
    await screen.findByText(SAVED)

    fakeSupabase.state.offline = true
    await first.user.click(screen.getByRole('button', { name: 'Edit Old Name' }))
    await first.user.clear(screen.getByLabelText(/plant name/i))
    await first.user.type(screen.getByLabelText(/plant name/i), 'New Name')
    await first.user.click(screen.getByRole('button', { name: /save changes/i }))
    await screen.findByText(/you are offline/i)
    first.unmount()

    fakeSupabase.state.offline = false
    fakeSupabase.state.rows[0].data = { ...original, name: 'Remote Name' }
    setup()
    expect(await screen.findByText(SAVED)).toBeInTheDocument()
    await waitFor(() => expect(myNames()).toEqual(['New Name']))
    expect(screen.getByText('New Name')).toBeInTheDocument()
  })

  it('picks up changes made on another device when the tab is shown again', async () => {
    seed(me().id, plant('Here Already'))
    setup()
    await screen.findByText('Here Already')
    await screen.findByText(SAVED)

    seed(me().id, plant('From My Phone'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByText('From My Phone')).toBeInTheDocument()
    expect(listNames()).toEqual(['From My Phone', 'Here Already'])
  })

  it('says what to do when the database has not been set up', async () => {
    fakeSupabase.state.tableMissing = true
    const { user } = setup()
    expect(await screen.findByRole('alert')).toHaveTextContent(/supabase\/schema\.sql/)
    await addPlant(user, 'Local Fern')
    expect(screen.getByText('Local Fern')).toBeInTheDocument()
  })

  it('says when the sign-in is no longer allowed to save', async () => {
    const { user } = setup()
    await screen.findByText(SAVED)
    fakeSupabase.state.session = null
    await addPlant(user, 'Fern')
    expect(await screen.findByText(/sign-in has expired/i)).toBeInTheDocument()
    expect(screen.getByText('Fern')).toBeInTheDocument()
  })
})

describe('signing out', () => {
  it('saves anything still waiting, then removes this device\'s copy', async () => {
    const { user } = setup()
    await screen.findByText(SAVED)
    await addPlant(user, 'Last Minute Fern')
    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    expect(await screen.findByText('You are signed out.')).toBeInTheDocument()
    expect(myNames()).toEqual(['Last Minute Fern'])
    const keys = Object.keys(window.localStorage)
    expect(keys.some((key) => key.startsWith('plant-care-notes-plants:cloud-'))).toBe(false)
    expect(keys.some((key) => key.startsWith('plant-care-notes-pending:'))).toBe(false)
  })

  it('keeps this device\'s copy when it could not be saved', async () => {
    const { user } = setup()
    await screen.findByText(SAVED)
    fakeSupabase.state.offline = true
    await addPlant(user, 'Offline Fern')
    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    expect(await screen.findByText('You are signed out.')).toBeInTheDocument()
    expect(fakeSupabase.rowsFor(me().id)).toHaveLength(0)
    expect(window.localStorage.getItem(`plant-care-notes-plants:cloud-${me().id}`)).toContain('Offline Fern')
    expect(JSON.parse(window.localStorage.getItem(`plant-care-notes-pending:${me().id}`)).dirty).toBe(true)
  })
})

describe('plants saved in this browser before accounts were online', () => {
  const old = (name) => plant(name)

  it('offers to add them to the account, then removes the old copies', async () => {
    window.localStorage.setItem('plant-care-notes-plants', JSON.stringify([old('Old Guest Plant')]))
    window.localStorage.setItem('plant-care-notes-plants:some-local-account', JSON.stringify([old('Old Account Plant')]))
    window.localStorage.setItem('plant-care-notes-plants:cloud-someone-else', JSON.stringify([old('Not Old At All')]))
    window.localStorage.setItem('plant-care-notes-users', '[{"id":"x"}]')
    window.localStorage.setItem('plant-care-notes-session', 'x')
    const { user } = setup()

    const banner = await screen.findByRole('region', { name: 'Plants found on this device' })
    expect(banner).toHaveTextContent('We found 2 plants saved in this browser')
    expect(window.localStorage.getItem('plant-care-notes-users')).toBeNull()
    expect(window.localStorage.getItem('plant-care-notes-session')).toBeNull()

    await user.click(within(banner).getByRole('button', { name: 'Add 2 plants to my account' }))
    expect(await screen.findByText('Old Guest Plant')).toBeInTheDocument()
    expect(listNames()).toEqual(['Old Account Plant', 'Old Guest Plant'])
    await waitFor(() => expect(myNames()).toEqual(['Old Account Plant', 'Old Guest Plant']))
    expect(screen.queryByRole('region', { name: 'Plants found on this device' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('plant-care-notes-plants')).toBeNull()
    expect(window.localStorage.getItem('plant-care-notes-plants:some-local-account')).toBeNull()
    expect(window.localStorage.getItem('plant-care-notes-plants:cloud-someone-else')).not.toBeNull()
  })

  it('can be dismissed without losing them', async () => {
    window.localStorage.setItem('plant-care-notes-plants', JSON.stringify([old('Old Guest Plant')]))
    const { user } = setup()
    const banner = await screen.findByRole('region', { name: 'Plants found on this device' })
    await user.click(within(banner).getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('region', { name: 'Plants found on this device' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('plant-care-notes-plants')).toContain('Old Guest Plant')
    expect(fakeSupabase.rowsFor(me().id)).toHaveLength(0)
  })

  it('does not offer anything when there is nothing old on the device', async () => {
    setup()
    await screen.findByText(SAVED)
    expect(screen.queryByRole('region', { name: 'Plants found on this device' })).not.toBeInTheDocument()
  })

  it('does not add one that is already in the account', async () => {
    const [existing] = seed(me().id, plant('Both Places'))
    window.localStorage.setItem('plant-care-notes-plants', JSON.stringify([existing]))
    const { user } = setup()
    const banner = await screen.findByRole('region', { name: 'Plants found on this device' })
    await user.click(within(banner).getByRole('button', { name: /add it to my account/i }))
    expect(await screen.findByText(/added 0 plants/i)).toBeInTheDocument()
    expect(listNames()).toEqual(['Both Places'])
  })
})
