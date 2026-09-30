import { useEffect, useState } from 'react'
import { readPlants, writePlants } from './storage.js'
import PlantTypePicker from './PlantTypePicker.jsx'

const emptyForm = { name: '', careNote: '', lastWatered: '', plantTypes: [] }

function todayString() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function App() {
  const [plants, setPlants] = useState(readPlants)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    setStorageWarning(!writePlants(plants))
  }, [plants])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (value.trim()) setErrors((current) => ({ ...current, [name]: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const careNote = form.careNote.trim()
    const { lastWatered, plantTypes } = form
    const nextErrors = {}
    if (!name) nextErrors.name = 'Enter a plant name before saving.'
    if (!careNote) nextErrors.careNote = 'Enter a care note before saving.'
    if (nextErrors.name || nextErrors.careNote) {
      setErrors(nextErrors)
      document.getElementById(nextErrors.name ? 'plant-name' : 'plant-care-note')?.focus()
      return
    }
    if (editingId) {
      setPlants((current) => current.map((plant) =>
        plant.id === editingId ? { ...plant, name, careNote, lastWatered, plantTypes } : plant,
      ))
      setEditingId(null)
    } else {
      setPlants((current) => [
        { id: crypto.randomUUID(), name, careNote, lastWatered, plantTypes, createdAt: new Date().toISOString() },
        ...current,
      ])
    }
    setForm(emptyForm)
    setErrors({})
  }

  function startEdit(plant) {
    setEditingId(plant.id)
    setForm({ name: plant.name, careNote: plant.careNote, lastWatered: plant.lastWatered ?? '', plantTypes: plant.plantTypes ?? [] })
    setErrors({})
    document.getElementById('plant-name')?.focus()
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
  }

  function focusForm() {
    const field = document.getElementById('plant-name')
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field?.focus({ preventScroll: true })
  }

  function deletePlant(id) {
    setPlants((current) => current.filter((plant) => plant.id !== id))
    if (editingId === id) cancelEdit()
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">HOUSEPLANT CARE</p>
        <h1>Plant Care Notes</h1>
        <p className="intro">Keep a short care note for each of your houseplants, all in one place.</p>
      </header>

      <section className="panel" aria-labelledby="form-heading">
        <h2 id="form-heading">{editingId ? 'Edit plant' : 'Add a plant'}</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="plant-name">Plant name <span aria-hidden="true">*</span></label>
          <input id="plant-name" name="name" value={form.name} onChange={handleChange}
            maxLength={80} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : 'name-help'} />
          {errors.name ? <p className="error" id="name-error" role="alert">{errors.name}</p> :
            <p className="hint" id="name-help">Required. Keep it under 80 characters.</p>}

          <label htmlFor="plant-care-note">Care note <span aria-hidden="true">*</span></label>
          <textarea id="plant-care-note" name="careNote" value={form.careNote} onChange={handleChange}
            rows="3" maxLength={240} aria-invalid={Boolean(errors.careNote)}
            aria-describedby={errors.careNote ? 'care-note-error' : 'care-note-help'} />
          {errors.careNote ? <p className="error" id="care-note-error" role="alert">{errors.careNote}</p> :
            <p className="hint" id="care-note-help">Required. For example: water weekly, bright indirect light. Do not enter sensitive personal information.</p>}

          <label htmlFor="plant-types">Plant types</label>
          <PlantTypePicker value={form.plantTypes}
            onChange={(plantTypes) => setForm((current) => ({ ...current, plantTypes }))} />
          <p className="hint">Optional. Choose one or more indoor plant types. You can still type your own name above.</p>

          <label htmlFor="plant-last-watered">Last watered</label>
          <input id="plant-last-watered" name="lastWatered" type="date" value={form.lastWatered}
            onChange={handleChange} max={todayString()} aria-describedby="last-watered-help" />
          <p className="hint" id="last-watered-help">Optional. Pick the date you last watered this plant.</p>

          <div className="actions">
            <button type="submit">{editingId ? 'Save changes' : 'Save plant'}</button>
            {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </section>

      {storageWarning && <p className="notice" role="status">This browser could not save changes. Your list may not survive a refresh.</p>}

      <section className="records" aria-labelledby="plants-heading">
        <div className="section-heading">
          <div><p className="eyebrow">YOUR PLANTS</p><h2 id="plants-heading">Plants <span className="count">{plants.length}</span></h2></div>
        </div>
        {plants.length === 0 ? (
          <div className="empty">
            <h3>No plants saved yet</h3>
            <p>Add your first plant to keep its care notes in one place.</p>
            <button type="button" onClick={focusForm}>Add your first plant</button>
          </div>
        ) : (
          <ul className="record-list">
            {plants.map((plant) => (
              <li className="record" key={plant.id}>
                <div className="record-copy"><h3>{plant.name}</h3>
                  {plant.plantTypes?.length > 0 && (
                    <ul className="chips" aria-label="Plant types">
                      {plant.plantTypes.map((type) => <li key={type}>{type}</li>)}
                    </ul>
                  )}
                  {plant.careNote && <p>{plant.careNote}</p>}
                  {plant.lastWatered && <p className="watered">Last watered: {formatDate(plant.lastWatered)}</p>}</div>
                <div className="record-actions">
                  <button type="button" className="secondary" aria-label={`Edit ${plant.name}`} onClick={() => startEdit(plant)}>Edit</button>
                  <button type="button" className="danger" aria-label={`Delete ${plant.name}`} onClick={() => deletePlant(plant.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer><p>Plants are saved in this browser only. Browser storage is not a secure or shared database.</p></footer>
    </main>
  )
}
