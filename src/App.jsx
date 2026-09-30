import { useEffect, useState } from 'react'
import { readRecords, writeRecords } from './storage.js'

const emptyForm = { title: '', details: '' }

export default function App() {
  const [records, setRecords] = useState(readRecords)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    setStorageWarning(!writeRecords(records))
  }, [records])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'title' && value.trim()) setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError('Enter a title before saving.')
      return
    }
    if (editingId) {
      setRecords((current) => current.map((record) =>
        record.id === editingId ? { ...record, title, details: form.details.trim() } : record,
      ))
      setEditingId(null)
    } else {
      setRecords((current) => [
        { id: crypto.randomUUID(), title, details: form.details.trim(), createdAt: new Date().toISOString() },
        ...current,
      ])
    }
    setForm(emptyForm)
    setError('')
  }

  function startEdit(record) {
    setEditingId(record.id)
    setForm({ title: record.title, details: record.details })
    setError('')
    document.getElementById('record-title')?.focus()
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  function deleteRecord(id) {
    setRecords((current) => current.filter((record) => record.id !== id))
    if (editingId === id) cancelEdit()
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">THREE-DAY VIBE CODING WORKSHOP</p>
        <h1>Workshop MVP Starter</h1>
        <p className="intro">A small React app for practicing one complete record workflow. Adapt the fields and labels to your project.</p>
      </header>

      <section className="panel" aria-labelledby="form-heading">
        <h2 id="form-heading">{editingId ? 'Edit record' : 'Add a record'}</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="record-title">Title <span aria-hidden="true">*</span></label>
          <input id="record-title" name="title" value={form.title} onChange={handleChange}
            maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? 'title-error' : 'title-help'} />
          {error ? <p className="error" id="title-error" role="alert">{error}</p> :
            <p className="hint" id="title-help">Required. Keep it under 80 characters.</p>}

          <label htmlFor="record-details">Details</label>
          <textarea id="record-details" name="details" value={form.details} onChange={handleChange}
            rows="3" maxLength={240} />
          <p className="hint">Optional. Do not enter sensitive personal information.</p>

          <div className="actions">
            <button type="submit">{editingId ? 'Save changes' : 'Add record'}</button>
            {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </section>

      {storageWarning && <p className="notice" role="status">This browser could not save changes. Your list may not survive a refresh.</p>}

      <section className="records" aria-labelledby="records-heading">
        <div className="section-heading">
          <div><p className="eyebrow">YOUR LOCAL DATA</p><h2 id="records-heading">Records <span className="count">{records.length}</span></h2></div>
        </div>
        {records.length === 0 ? (
          <div className="empty"><h3>No records yet</h3><p>Add a record above to try the workflow. Saved records stay in this browser.</p></div>
        ) : (
          <ul className="record-list">
            {records.map((record) => (
              <li className="record" key={record.id}>
                <div className="record-copy"><h3>{record.title}</h3>{record.details && <p>{record.details}</p>}</div>
                <div className="record-actions">
                  <button type="button" className="secondary" onClick={() => startEdit(record)}>Edit</button>
                  <button type="button" className="danger" onClick={() => deleteRecord(record.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer><p>Learning scaffold only. Browser storage is local to this origin and is not a secure or shared database.</p></footer>
    </main>
  )
}
