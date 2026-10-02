import { useEffect, useMemo, useRef, useState } from 'react'
import { buildBackup, parseBackup, readPlants, readTheme, writePlants, writeTheme } from './storage.js'
import { deleteUser, readSession, signOutUser } from './accounts.js'
import AuthDialog from './AuthDialog.jsx'
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

// Everything the signed-in person (or the guest) sees. It is remounted when the person changes,
// so one account's plants are never shown to another.
function Workspace({ auth }) {
  const scope = auth.user?.id
  const [plants, setPlants] = useState(() => readPlants(scope))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [query, setQuery] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [sort, setSort] = useState('newest')
  const [undo, setUndo] = useState(null)
  const [backupMessage, setBackupMessage] = useState('')
  const [theme, setTheme] = useState(readTheme)
  const [storageWarning, setStorageWarning] = useState(false)
  const importRef = useRef(null)

  useEffect(() => {
    setStorageWarning(!writePlants(plants, scope))
  }, [plants, scope])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

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

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      writeTheme(next)
      return next
    })
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
            {auth.user ? (
              <>
                <span className="user-chip" title={auth.user.email}>
                  <span className="avatar" aria-hidden="true">{auth.user.name.trim().charAt(0).toUpperCase()}</span>
                  <span className="user-name">{auth.user.name}</span>
                </span>
                <button type="button" className="secondary" onClick={auth.signOut}>Sign out</button>
              </>
            ) : (
              <>
                <button type="button" className="secondary" onClick={() => auth.open('signin')}>Sign in</button>
                <button type="button" className="account-cta" onClick={() => auth.open('register')}>Create account</button>
              </>
            )}
          </div>
          <button type="button" className="secondary theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
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
            {auth.user ? (
              <p className="hero-account">Signed in as <strong>{auth.user.name}</strong>. These are your plants.</p>
            ) : (
              <p className="hero-account no-print">
                New here?{' '}
                <button type="button" className="link-light" onClick={() => auth.open('register')}>Create a free account</button>
                {' '}to keep your plants in your own space, or carry on as a guest.
              </p>
            )}
            <ul className="hero-stats" aria-label="Summary">
              <li><strong>{plants.length}</strong><span>{plants.length === 1 ? 'plant' : 'plants'}</span></li>
              <li><strong>{thirsty.length}</strong><span>to water</span></li>
              <li><strong>{openIssues}</strong><span>open {openIssues === 1 ? 'issue' : 'issues'}</span></li>
            </ul>
          </div>
          <PlantArt className="hero-art" />
        </section>

        {storageWarning && <p className="notice" role="status">This browser could not save changes. Your list may not survive a refresh.</p>}

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
          <p className="hint">Plants live only in this browser. Export a file to keep a copy, or import one to restore it.</p>
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
                Signed in as {auth.user.name} ({auth.user.email}). Your plants are saved under this account on this device
                only, so they will not appear on your other devices. Export a backup to move them.
              </p>
              <div className="actions">
                <button type="button" className="secondary" onClick={auth.signOut}>Sign out</button>
                {!confirmingDelete && (
                  <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>Delete account</button>
                )}
              </div>
              {confirmingDelete && (
                <div className="forgot-panel" role="alert">
                  <p>
                    This removes the account and its {plants.length} {plants.length === 1 ? 'plant' : 'plants'} from this
                    device. It cannot be undone. Export a backup first if you want to keep them.
                  </p>
                  <div className="actions">
                    <button type="button" className="danger" onClick={() => auth.deleteAccount(auth.user.id)}>Yes, delete my account</button>
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
        <p>Plants are saved in this browser only. Browser storage is not a secure or shared database.</p>
      </footer>
    </>
  )
}

const WELCOME_MS = 7000

export default function App() {
  const [user, setUser] = useState(readSession)
  const [dialogTab, setDialogTab] = useState(null)
  const [welcome, setWelcome] = useState('')

  useEffect(() => {
    if (!welcome) return undefined
    const timer = setTimeout(() => setWelcome(''), WELCOME_MS)
    return () => clearTimeout(timer)
  }, [welcome])

  function handleAuthenticated(person, { created, moved }) {
    setUser(person)
    setDialogTab(null)
    const extra = moved > 0 ? ` ${moved} ${moved === 1 ? 'plant was' : 'plants were'} added to your account.` : ''
    setWelcome(created ? `Welcome, ${person.name}. Your account is ready.${extra}` : `Welcome back, ${person.name}.`)
  }

  function signOut() {
    signOutUser()
    setUser(null)
    setWelcome('You are signed out.')
  }

  function deleteAccount(id) {
    deleteUser(id)
    setUser(null)
    setWelcome('Your account was deleted from this device.')
  }

  const auth = { user, open: setDialogTab, signOut, deleteAccount }

  return (
    <>
      <div inert={dialogTab ? true : undefined} aria-hidden={dialogTab ? true : undefined}>
        <Workspace key={user?.id ?? 'guest'} auth={auth} />
      </div>
      {dialogTab && (
        <AuthDialog key={dialogTab} initialTab={dialogTab} onClose={() => setDialogTab(null)} onAuthenticated={handleAuthenticated} />
      )}
      {welcome && <div className="toast welcome-toast" role="status"><span>{welcome}</span></div>}
    </>
  )
}
