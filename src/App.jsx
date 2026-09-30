import { useEffect, useMemo, useRef, useState } from 'react'
import { buildBackup, parseBackup, readPlants, readTheme, writePlants, writeTheme } from './storage.js'
import { filterPlants, sortPlants, todayString, wateringStatus } from './plantUtils.js'
import PlantForm from './PlantForm.jsx'
import PlantCard from './PlantCard.jsx'
import PlantControls from './PlantControls.jsx'

const UNDO_MS = 8000

export default function App() {
  const [plants, setPlants] = useState(readPlants)
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
    setStorageWarning(!writePlants(plants))
  }, [plants])

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

  function resetForm() {
    setEditingId(null)
    setFormKey((current) => current + 1)
  }

  function handleSubmit(values) {
    if (editingPlant) {
      setPlants((current) => current.map((plant) => (plant.id === editingPlant.id ? { ...plant, ...values } : plant)))
    } else {
      setPlants((current) => [{ id: crypto.randomUUID(), ...values, createdAt: new Date().toISOString() }, ...current])
    }
    resetForm()
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
    <main className="shell">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">HOUSEPLANT CARE</p>
          <button type="button" className="secondary theme-toggle no-print"
            onClick={() => setTheme((current) => {
              const next = current === 'dark' ? 'light' : 'dark'
              writeTheme(next)
              return next
            })}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <h1>Plant Care Notes</h1>
        <p className="intro">Keep a short care note for each of your houseplants, all in one place.</p>
      </header>

      <section className="panel no-print" aria-labelledby="form-heading">
        <h2 id="form-heading">{editingPlant ? 'Edit plant' : 'Add a plant'}</h2>
        <PlantForm key={formKey} plant={editingPlant} onSubmit={handleSubmit} onCancel={resetForm} />
      </section>

      {storageWarning && <p className="notice" role="status">This browser could not save changes. Your list may not survive a refresh.</p>}

      {thirsty.length > 0 && (
        <section className="due" aria-labelledby="due-heading">
          <h2 id="due-heading">Needs water <span className="count">{thirsty.length}</span></h2>
          <ul>
            {thirsty.map((plant) => (
              <li key={plant.id}><strong>{plant.name}</strong> <span>{wateringStatus(plant, today).label}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="records" aria-labelledby="plants-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR PLANTS</p>
            <h2 id="plants-heading">Plants <span className="count">{filtering ? `${visiblePlants.length} of ${plants.length}` : plants.length}</span></h2>
          </div>
          {plants.length > 0 && <button type="button" className="secondary no-print" onClick={() => window.print()}>Print care sheet</button>}
        </div>

        {plants.length > 0 && (
          <PlantControls query={query} recommendation={recommendation} sort={sort} filtering={filtering}
            onQuery={setQuery} onRecommendation={setRecommendation} onSort={setSort} onClear={clearFilters} />
        )}

        {plants.length === 0 ? (
          <div className="empty">
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
              <PlantCard key={plant.id} plant={plant} today={today} onEdit={startEdit} onDelete={deletePlant} />
            ))}
          </ul>
        )}
      </section>

      <section className="backup no-print" aria-labelledby="backup-heading">
        <h2 id="backup-heading">Backup</h2>
        <p className="hint">Plants live only in this browser. Export a file to keep a copy, or import one to restore it.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={exportBackup} disabled={plants.length === 0}>Export plants</button>
          <button type="button" className="secondary" onClick={() => importRef.current?.click()}>Import plants</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Import backup file" onChange={importBackup} />
        </div>
        {backupMessage && <p className="hint" role="status">{backupMessage}</p>}
      </section>

      {undo && (
        <div className="toast" role="status">
          <span>Deleted {undo.plant.name}.</span>
          <button type="button" onClick={undoDelete}>Undo</button>
        </div>
      )}

      <footer><p>Plants are saved in this browser only. Browser storage is not a secure or shared database.</p></footer>
    </main>
  )
}
