import { useEffect, useState } from 'react'
import { readPlants, writePlants } from './storage.js'

const emptyForm = { name: '', careNote: '' }

export default function App() {
  const [plants, setPlants] = useState(readPlants)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    setStorageWarning(!writePlants(plants))
  }, [plants])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'name' && value.trim()) setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Enter a plant name before saving.')
      return
    }
    if (editingId) {
      setPlants((current) => current.map((plant) =>
        plant.id === editingId ? { ...plant, name, careNote: form.careNote.trim() } : plant,
      ))
      setEditingId(null)
    } else {
      setPlants((current) => [
        { id: crypto.randomUUID(), name, careNote: form.careNote.trim(), createdAt: new Date().toISOString() },
        ...current,
      ])
    }
    setForm(emptyForm)
    setError('')
  }

  function startEdit(plant) {
    setEditingId(plant.id)
    setForm({ name: plant.name, careNote: plant.careNote })
    setError('')
    document.getElementById('plant-name')?.focus()
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
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
            maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : 'name-help'} />
          {error ? <p className="error" id="name-error" role="alert">{error}</p> :
            <p className="hint" id="name-help">Required. Keep it under 80 characters.</p>}

          <label htmlFor="plant-care-note">Care note</label>
          <textarea id="plant-care-note" name="careNote" value={form.careNote} onChange={handleChange}
            rows="3" maxLength={240} />
          <p className="hint">For example: water weekly, bright indirect light. Do not enter sensitive personal information.</p>

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
          <div className="empty"><h3>No plants yet</h3><p>Add a plant above. Saved plants stay in this browser.</p></div>
        ) : (
          <ul className="record-list">
            {plants.map((plant) => (
              <li className="record" key={plant.id}>
                <div className="record-copy"><h3>{plant.name}</h3>{plant.careNote && <p>{plant.careNote}</p>}</div>
                <div className="record-actions">
                  <button type="button" className="secondary" onClick={() => startEdit(plant)}>Edit</button>
                  <button type="button" className="danger" onClick={() => deletePlant(plant.id)}>Delete</button>
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
