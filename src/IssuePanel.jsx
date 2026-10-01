import { useId, useState } from 'react'
import MultiSelect from './MultiSelect.jsx'
import { KIND_LABELS, PROBLEMS, SYMPTOMS, findProblem, matchProblems } from './pestsAndDiseases.js'
import { compressImage } from './photo.js'
import { formatDate, todayString } from './plantUtils.js'

const ISSUE_PHOTO_SIZE = 360

function Treatment({ problem }) {
  return (
    <div className="treatment">
      <p className="treatment-title">{problem.name}: what to try</p>
      <p className="treatment-about">{problem.about}</p>
      <ul>
        {problem.treatment.map((step) => <li key={step}>{step}</li>)}
      </ul>
    </div>
  )
}

function IssueForm({ plantName, onSave, onCancel }) {
  const uid = useId()
  const [photo, setPhoto] = useState('')
  const [date, setDate] = useState(todayString())
  const [symptoms, setSymptoms] = useState([])
  const [suspected, setSuspected] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [busy, setBusy] = useState(false)
  const matches = matchProblems(symptoms)

  async function handlePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setPhoto(await compressImage(file, ISSUE_PHOTO_SIZE))
      setPhotoError('')
      setError('')
    } catch (problem) {
      setPhotoError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!photo && symptoms.length === 0 && !suspected && !notes.trim()) {
      setError('Add a photo, choose a symptom, pick a suspected problem or write a note.')
      return
    }
    onSave({
      id: crypto.randomUUID(), date, photo, symptoms, suspected, notes: notes.trim(), resolved: false,
    })
  }

  return (
    <form className="issue-form" onSubmit={handleSubmit} noValidate aria-label={`Report a problem on ${plantName}`}>
      <label htmlFor={`${uid}-photo`}>Photo of the affected plant or pest</label>
      <input id={`${uid}-photo`} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto}
        aria-invalid={Boolean(photoError)} aria-describedby={`${uid}-photo-help`} />
      {photoError ? <p className="error" id={`${uid}-photo-help`} role="alert">{photoError}</p> :
        <p className="hint" id={`${uid}-photo-help`}>Optional. Take it close up, in good light. It is saved with this plant so you can compare over time.</p>}
      {busy && <p className="hint" role="status">Processing photo…</p>}
      {photo && (
        <div className="photo-preview">
          <img src={photo} alt="Selected problem" />
          <button type="button" className="secondary" onClick={() => setPhoto('')}>Remove photo</button>
        </div>
      )}

      <label htmlFor={`${uid}-date`}>Date noticed</label>
      <input id={`${uid}-date`} type="date" value={date} max={todayString()} onChange={(event) => setDate(event.target.value)} />

      <label id={`${uid}-symptoms-label`} htmlFor={`${uid}-symptoms`}>What do you see?</label>
      <MultiSelect id={`${uid}-symptoms`} labelId={`${uid}-symptoms-label`} options={SYMPTOMS} value={symptoms}
        placeholder="Choose symptoms" groupLabel="Symptoms"
        onChange={(next) => { setSymptoms(next); setError('') }} />

      {matches.length > 0 && (
        <div className="matches" role="region" aria-label="Possible matches">
          <p className="matches-title">Possible matches</p>
          <p className="hint">Ranked by how many of your symptoms they share. This is a guide, not a diagnosis. Compare with your photo.</p>
          <ul>
            {matches.map(({ problem, matched }) => (
              <li key={problem.id}>
                <div>
                  <strong>{problem.name}</strong> <span className="kind">{KIND_LABELS[problem.kind]}</span>
                  <p>Matches {matched.length} of your {symptoms.length} {symptoms.length === 1 ? 'symptom' : 'symptoms'}. {problem.about}</p>
                </div>
                <button type="button" className="secondary" aria-label={`Use ${problem.name} as the suspected problem`}
                  onClick={() => { setSuspected(problem.name); setError('') }}>
                  {suspected === problem.name ? 'Selected' : 'Use this'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label htmlFor={`${uid}-suspected`}>Suspected problem</label>
      <select id={`${uid}-suspected`} value={suspected} onChange={(event) => { setSuspected(event.target.value); setError('') }}>
        <option value="">Not sure</option>
        {PROBLEMS.map((problem) => <option key={problem.id} value={problem.name}>{problem.name}</option>)}
      </select>

      <label htmlFor={`${uid}-notes`}>Notes</label>
      <textarea id={`${uid}-notes`} rows="2" maxLength={240} value={notes}
        onChange={(event) => { setNotes(event.target.value); setError('') }} />

      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={busy}>Save problem</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function IssuePanel({ plant, onChange }) {
  const [adding, setAdding] = useState(false)
  const issues = plant.issues ?? []
  const openCount = issues.filter((issue) => !issue.resolved).length

  function save(issue) {
    onChange([issue, ...issues])
    setAdding(false)
  }

  function toggleResolved(id) {
    onChange(issues.map((issue) => (issue.id === id ? { ...issue, resolved: !issue.resolved } : issue)))
  }

  function remove(id) {
    onChange(issues.filter((issue) => issue.id !== id))
  }

  return (
    <details className="issues no-print">
      <summary>Pests and diseases{openCount > 0 ? ` (${openCount} open)` : ''}</summary>
      {issues.length === 0 && !adding && <p className="hint">No problems recorded for this plant.</p>}
      {issues.length > 0 && (
        <ul className="issue-list" aria-label={`Problems on ${plant.name}`}>
          {issues.map((issue) => {
            const problem = findProblem(issue.suspected)
            return (
              <li key={issue.id} className={issue.resolved ? 'issue issue-resolved' : 'issue'}>
                {issue.photo && <img src={issue.photo} alt={`Problem photo on ${plant.name}`} />}
                <div className="issue-body">
                  <p className="issue-head">
                    <strong>{issue.suspected || 'Problem not identified'}</strong>
                    {problem && <span className="kind">{KIND_LABELS[problem.kind]}</span>}
                    <span className={issue.resolved ? 'state state-done' : 'state'}>{issue.resolved ? 'Resolved' : 'Open'}</span>
                  </p>
                  {issue.date && <p className="issue-meta">Noticed {formatDate(issue.date)}</p>}
                  {issue.symptoms.length > 0 && (
                    <ul className="chips" aria-label="Symptoms">
                      {issue.symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}
                    </ul>
                  )}
                  {issue.notes && <p className="issue-notes">{issue.notes}</p>}
                  {problem && !issue.resolved && <Treatment problem={problem} />}
                  <div className="actions">
                    <button type="button" className="secondary" onClick={() => toggleResolved(issue.id)}>
                      {issue.resolved ? 'Reopen' : 'Mark resolved'}
                    </button>
                    <button type="button" className="danger" onClick={() => remove(issue.id)}>Delete problem</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {adding ? (
        <IssueForm plantName={plant.name} onSave={save} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" className="secondary" onClick={() => setAdding(true)}>Report a problem</button>
      )}
    </details>
  )
}
