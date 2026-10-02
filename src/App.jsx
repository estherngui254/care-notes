import { useEffect, useMemo, useRef, useState } from 'react'
import { buildBackup, parseBackup, readTheme, writeTheme } from './storage.js'
import { deleteMyAccount, getCurrentPerson, readCachedPerson, signOutPerson, watchAuth } from './auth.js'
import { useCloudPlants } from './useCloudPlants.js'
import { clearLegacyPlants, readLegacyPlants, removeOldAccounts } from './legacy.js'
import AuthScreen, { SetNewPassword } from './AuthScreen.jsx'
import { filterPlants, sortPlants, todayString, wateringStatus } from './plantUtils.js'
import { CameraIcon, DropIcon, LeafIcon, MoonIcon, PlantArt, PlusIcon, PrintIcon, SproutIcon, SunIcon } from './icons.jsx'
import PlantForm from './PlantForm.jsx'
import PlantCard from './PlantCard.jsx'
import PlantControls from './PlantControls.jsx'
import PestGuide from './PestGuide.jsx'
import PlantShop from './PlantShop.jsx'
import QrShare from './QrShare.jsx'
import PlantScanner from './PlantScanner.jsx'

const UNDO_MS = 8000

// Everything a signed-in person sees. It is remounted when the person changes,
// so one account's plants are never shown to another.
const SYNC_LABELS = {
  loading: 'Loading your plants…',
  saving: 'Saving…',
  saved: 'Saved to your account.',
}

function Workspace({ auth }) {
  const { plants, setPlants, status, detail, retry, finish } = useCloudPlants(auth.user.id)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [legacy, setLegacy] = useState(readLegacyPlants)
  const [legacyHidden, setLegacyHidden] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [query, setQuery] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [sort, setSort] = useState('newest')
  const [undo, setUndo] = useState(null)
  const [backupMessage, setBackupMessage] = useState('')
  const importRef = useRef(null)

  // Anything still waiting to be saved is sent before signing out.
  async function signOutNow() {
    await finish()
    auth.signOut()
  }

  async function deleteAccountNow() {
    setDeleteError('')
    const result = await auth.deleteAccount()
    if (result?.error) setDeleteError(result.error)
  }

  function importLegacy() {
    const known = new Set(plants.map((plant) => plant.id))
    const fresh = legacy.filter((plant) => !known.has(plant.id))
    setPlants((current) => [...fresh, ...current])
    clearLegacyPlants()
    setLegacy([])
    setBackupMessage(`Added ${fresh.length} ${fresh.length === 1 ? 'plant' : 'plants'} from this browser to your account.`)
  }

  useEffect(() => {
    if (!undo) return undefined
    const timer = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [undo])

  const today = todayString()
  const editingPlant = plants.find((plant) => plant.id === editingId) ?? null
  const filtering = Boolean(query.trim() || recommendation)
  const visiblePlants = useMemo(
    () => sortPlants(filterPlants(plants, { query, recommendation }), sort, today),
    [plants, query, recommendation, sort, today],
  )
  const thirsty = plants.filter((plant) => wateringStatus(plant, today).needsWater)
  const openIssues = plants.reduce((total, plant) => total + (plant.issues ?? []).filter((issue) => !issue.resolved).length, 0)
  const countLabel = filtering ? `${visiblePlants.length} of ${plants.length}` : plants.length

  function resetForm() {
    setEditingId(null)
    setFormKey((current) => current + 1)
  }

  function handleSubmit(values) {
    if (editingPlant) {
      setPlants((current) => current.map((plant) => (plant.id === editingPlant.id ? { ...plant, ...values } : plant)))
    } else {
      setPlants((current) => [{ id: crypto.randomUUID(), ...values, issues: [], createdAt: new Date().toISOString() }, ...current])
    }
    resetForm()
  }

  function addScannedPlant(values) {
    setPlants((current) => [{ id: crypto.randomUUID(), ...values, createdAt: new Date().toISOString() }, ...current])
  }

  function updateIssues(plantId, issues) {
    setPlants((current) => current.map((plant) => (plant.id === plantId ? { ...plant, issues } : plant)))
  }

  function startEdit(plant) {
    setEditingId(plant.id)
    setFormKey((current) => current + 1)
  }

  function focusForm() {
    const field = document.getElementById('plant-name')
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field?.focus({ preventScroll: true })
  }

  function deletePlant(plant) {
    const index = plants.findIndex((item) => item.id === plant.id)
    setPlants((current) => current.filter((item) => item.id !== plant.id))
    setUndo({ plant, index })
    if (editingId === plant.id) resetForm()
  }

  function undoDelete() {
    if (!undo) return
    const { plant, index } = undo
    setPlants((current) => {
      const next = [...current]
      next.splice(Math.min(index, next.length), 0, plant)
      return next
    })
    setUndo(null)
  }

  function clearFilters() {
    setQuery('')
    setRecommendation('')
  }

  function exportBackup() {
    const blob = new Blob([buildBackup(plants)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `plant-care-notes-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    setBackupMessage(`Exported ${plants.length} ${plants.length === 1 ? 'plant' : 'plants'}.`)
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = parseBackup(await file.text())
    if (result.error) {
      setBackupMessage(result.error)
      return
    }
    const known = new Set(plants.map((plant) => plant.id))
    const fresh = result.plants.filter((plant) => !known.has(plant.id))
    setPlants((current) => [...fresh, ...current])
    const duplicates = result.plants.length - fresh.length
    const parts = [`Imported ${fresh.length} ${fresh.length === 1 ? 'plant' : 'plants'}.`]
    if (duplicates > 0) parts.push(`${duplicates} already saved.`)
    if (result.skipped > 0) parts.push(`${result.skipped} could not be read.`)
    setBackupMessage(parts.join(' '))
  }

  return (
    <>
      <header className="topbar no-print">
        <div className="topbar-inner">
          <a className="brand" href="#top">
            <span className="brand-mark"><LeafIcon size={18} /></span>
            <span className="brand-name">Plant Care Notes</span>
          </a>
          <nav className="topnav" aria-label="Sections">
            <a href="#identify">Identify</a>
            <a href="#add-plant">Add plant</a>
            <a href="#my-plants">My plants</a>
            <a href="#guide">Guide</a>
            <a href="#shop">Shop</a>
            <a href="#share">Share</a>
            <a href="#backup">Backup</a>
          </nav>
          <div className="account-bar">
            <span className="user-chip" title={auth.user.email}>
              <span className="avatar" aria-hidden="true">{auth.user.name.trim().charAt(0).toUpperCase()}</span>
              <span className="user-name">{auth.user.name}</span>
            </span>
            <button type="button" className="secondary" onClick={signOutNow}>Sign out</button>
          </div>
          <button type="button" className="secondary theme-toggle" onClick={auth.toggleTheme}>
            {auth.theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            <span>{auth.theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </header>

      <main className="shell" id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Your houseplant journal</p>
            <h1 id="hero-title">Plant Care Notes</h1>
            <p className="intro">
              Snap a photo to identify a plant, then keep its care, watering and health notes together in one calm place.
            </p>
            <div className="hero-actions no-print">
              <a className="btn btn-light" href="#identify"><CameraIcon size={18} /> Identify from a photo</a>
              <a className="btn btn-ghost" href="#add-plant"><PlusIcon size={18} /> Add a plant</a>
            </div>
            <p className="hero-account">
              Signed in as <strong>{auth.user.name}</strong>.{' '}
              <span className={`sync-status sync-${status}`} role="status">
                {SYNC_LABELS[status] ?? detail}
              </span>
              {(status === 'offline' || status === 'error') && (
                <> <button type="button" className="link-light" onClick={retry}>Try again</button></>
              )}
            </p>
            <ul className="hero-stats" aria-label="Summary">
              <li><strong>{plants.length}</strong><span>{plants.length === 1 ? 'plant' : 'plants'}</span></li>
              <li><strong>{thirsty.length}</strong><span>to water</span></li>
              <li><strong>{openIssues}</strong><span>open {openIssues === 1 ? 'issue' : 'issues'}</span></li>
            </ul>
          </div>
          <PlantArt className="hero-art" />
        </section>

        {status === 'setup' && (
          <p className="notice" role="alert">
            Saving is not set up yet. The person running this app needs to run <code>supabase/schema.sql</code> in the Supabase SQL Editor.
            Until then, your plants are only kept on this device.
          </p>
        )}

        {legacy.length > 0 && !legacyHidden && status !== 'loading' && (
          <section className="notice legacy-notice" aria-label="Plants found on this device">
            <p>
              We found {legacy.length} {legacy.length === 1 ? 'plant' : 'plants'} saved in this browser from before accounts
              were stored online. Add {legacy.length === 1 ? 'it' : 'them'} to your account?
            </p>
            <div className="actions">
              <button type="button" onClick={importLegacy}>Add {legacy.length === 1 ? 'it' : `${legacy.length} plants`} to my account</button>
              <button type="button" className="secondary" onClick={() => setLegacyHidden(true)}>Not now</button>
            </div>
          </section>
        )}

        <div className="layout">
          <div className="col-main">
            {thirsty.length > 0 && (
              <section className="due" aria-labelledby="due-heading">
                <h2 id="due-heading"><DropIcon size={20} /> Needs water <span className="count">{thirsty.length}</span></h2>
                <ul>
                  {thirsty.map((plant) => (
                    <li key={plant.id}><strong>{plant.name}</strong> <span>{wateringStatus(plant, today).label}</span></li>
                  ))}
                </ul>
              </section>
            )}

            <section className="records" id="my-plants" aria-labelledby="plants-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Your collection</p>
                  <h2 id="plants-heading">Plants <span className="count">{countLabel}</span></h2>
                </div>
                {plants.length > 0 && (
                  <button type="button" className="secondary no-print" onClick={() => window.print()}>
                    <PrintIcon size={16} /> Print care sheet
                  </button>
                )}
              </div>

              {plants.length > 0 && (
                <PlantControls query={query} recommendation={recommendation} sort={sort} filtering={filtering}
                  onQuery={setQuery} onRecommendation={setRecommendation} onSort={setSort} onClear={clearFilters} />
              )}

              {plants.length === 0 ? (
                <div className="empty">
                  <PlantArt className="empty-art" />
                  <h3>No plants saved yet</h3>
                  <p>Add your first plant to keep its care notes in one place.</p>
                  <button type="button" onClick={focusForm}>Add your first plant</button>
                </div>
              ) : visiblePlants.length === 0 ? (
                <div className="empty">
                  <h3>No plants match</h3>
                  <p>Try a different search or clear the filters.</p>
                  <button type="button" onClick={clearFilters}>Clear filters</button>
                </div>
              ) : (
                <ul className="record-list" aria-label="Your plants">
                  {visiblePlants.map((plant) => (
                    <PlantCard key={plant.id} plant={plant} today={today} onEdit={startEdit} onDelete={deletePlant}
                      onIssuesChange={updateIssues} />
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="col-side">
            <PlantScanner onSavePlant={addScannedPlant} />

            <section className="panel no-print form-panel" id="add-plant" aria-labelledby="form-heading">
              <h2 id="form-heading"><SproutIcon size={22} /> {editingPlant ? 'Edit plant' : 'Add a plant'}</h2>
              <PlantForm key={formKey} plant={editingPlant} onSubmit={handleSubmit} onCancel={resetForm} />
            </section>
          </div>
        </div>

        <PestGuide />

        <PlantShop />

        <QrShare />

        <section className="backup no-print" id="backup" aria-labelledby="backup-heading">
          <p className="eyebrow">Your data</p>
          <h2 id="backup-heading">Backup</h2>
          <p className="hint">Your plants are saved in your account. Export a file to keep your own copy, or import one to add plants from it.</p>
          <div className="actions">
            <button type="button" className="secondary" onClick={exportBackup} disabled={plants.length === 0}>Export plants</button>
            <button type="button" className="secondary" onClick={() => importRef.current?.click()}>Import plants</button>
            <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Import backup file" onChange={importBackup} />
          </div>
          {backupMessage && <p className="hint" role="status">{backupMessage}</p>}

          {auth.user && (
            <div className="account-block">
              <h3>Your account</h3>
              <p className="hint">
                Signed in as {auth.user.name} ({auth.user.email}). Your plants are saved in this account, so they appear
                on any device where you sign in.
              </p>
              {deleteError && <p className="error" role="alert">{deleteError}</p>}
              <div className="actions">
                <button type="button" className="secondary" onClick={signOutNow}>Sign out</button>
                {!confirmingDelete && (
                  <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>Delete account</button>
                )}
              </div>
              {confirmingDelete && (
                <div className="forgot-panel" role="alert">
                  <p>
                    This permanently deletes the account and its {plants.length} {plants.length === 1 ? 'plant' : 'plants'},
                    from every device. It cannot be undone. Export a backup first if you want to keep them.
                  </p>
                  <div className="actions">
                    <button type="button" className="danger" onClick={deleteAccountNow}>Yes, delete my account</button>
                    <button type="button" className="secondary" onClick={() => setConfirmingDelete(false)}>Keep my account</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {undo && (
          <div className="toast" role="status">
            <span>Deleted {undo.plant.name}.</span>
            <button type="button" onClick={undoDelete}>Undo</button>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>Your plants are saved in your online account. Do not store anything sensitive in your notes.</p>
      </footer>
    </>
  )
}

const WELCOME_MS = 7000

// The app is only shown to someone who is signed in. Until then, the only thing on screen is the
// sign-in and register page, so no plants, guide, shop or editing controls are rendered at all.
const ACCOUNT_HINT_KEY = 'plant-care-notes-has-account'

function hasUsedAccount() {
  try {
    return window.localStorage.getItem(ACCOUNT_HINT_KEY) === 'yes'
  } catch {
    return false
  }
}

function rememberAccount() {
  try {
    window.localStorage.setItem(ACCOUNT_HINT_KEY, 'yes')
  } catch {
    // Only affects which tab opens first.
  }
}

export default function App() {
  const [user, setUser] = useState(readCachedPerson)
  const [recovering, setRecovering] = useState(false)
  const [theme, setTheme] = useState(readTheme)
  const [welcome, setWelcome] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Find out who is signed in (a session is kept in this browser), and keep listening for changes
  // such as signing out in another tab or opening a password-reset link.
  useEffect(() => {
    removeOldAccounts()
    let active = true
    let heardEvent = false
    getCurrentPerson().then((person) => {
      // A sign-in or sign-out event is newer than this answer, so it wins if it already arrived.
      if (active && !heardEvent) setUser(person)
    })
    const stop = watchAuth((event, person) => {
      if (!active) return
      heardEvent = true
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setRecovering(false)
      } else if (person) {
        setUser(person)
        rememberAccount()
      }
    })
    return () => {
      active = false
      stop()
    }
  }, [])

  useEffect(() => {
    if (!welcome) return undefined
    const timer = setTimeout(() => setWelcome(''), WELCOME_MS)
    return () => clearTimeout(timer)
  }, [welcome])

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      writeTheme(next)
      return next
    })
  }

  function handleAuthenticated(person, { created }) {
    setUser(person)
    rememberAccount()
    setWelcome(created ? `Welcome, ${person.name}. Your account is ready.` : `Welcome back, ${person.name}.`)
  }

  async function signOut() {
    await signOutPerson()
    setUser(null)
    setWelcome('You are signed out.')
  }

  async function deleteAccount() {
    const result = await deleteMyAccount()
    if (result.ok) {
      setUser(null)
      setWelcome('Your account was deleted.')
    }
    return result
  }

  function passwordChanged(person) {
    setRecovering(false)
    if (person) setUser(person)
    setWelcome('Your password was changed.')
  }

  let screen
  if (recovering) {
    screen = <SetNewPassword onDone={passwordChanged} theme={theme} onToggleTheme={toggleTheme} />
  } else if (user) {
    screen = <Workspace key={user.id} auth={{ user, signOut, deleteAccount, theme, toggleTheme }} />
  } else {
    screen = (
      <AuthScreen onAuthenticated={handleAuthenticated} theme={theme} onToggleTheme={toggleTheme}
        initialTab={hasUsedAccount() ? 'signin' : 'register'} />
    )
  }

  return (
    <>
      {screen}
      {welcome && <div className="toast welcome-toast" role="status"><span>{welcome}</span></div>}
    </>
  )
}
