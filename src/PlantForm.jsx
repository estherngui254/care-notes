import { useEffect, useRef, useState } from 'react'
import MultiSelect from './MultiSelect.jsx'
import { PLANT_TYPES } from './plantTypes.js'
import { CARE_RECOMMENDATIONS } from './careRecommendations.js'
import { parseWaterEvery, todayString } from './plantUtils.js'
import { compressImage } from './photo.js'

function toFormValues(plant) {
  return {
    name: plant?.name ?? '',
    careNote: plant?.careNote ?? '',
    lastWatered: plant?.lastWatered ?? '',
    waterEveryDays: plant?.waterEveryDays ? String(plant.waterEveryDays) : '',
    recommendations: plant?.recommendations ?? [],
    photo: plant?.photo ?? '',
  }
}

export default function PlantForm({ plant, onSubmit, onCancel }) {
  const editing = Boolean(plant)
  const [form, setForm] = useState(() => toFormValues(plant))
  const [errors, setErrors] = useState({})
  const [photoBusy, setPhotoBusy] = useState(false)
  const nameRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (editing) {
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nameRef.current?.focus({ preventScroll: true })
    }
  }, [editing])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (value.trim()) setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    try {
      const photo = await compressImage(file)
      setForm((current) => ({ ...current, photo }))
      setErrors((current) => ({ ...current, photo: '' }))
    } catch (error) {
      setErrors((current) => ({ ...current, photo: error.message }))
    } finally {
      setPhotoBusy(false)
    }
  }

  function removePhoto() {
    setForm((current) => ({ ...current, photo: '' }))
    setErrors((current) => ({ ...current, photo: '' }))
    fileRef.current?.focus()
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const careNote = form.careNote.trim()
    const { lastWatered, recommendations, photo } = form
    const water = parseWaterEvery(form.waterEveryDays.trim())
    const nextErrors = {}
    if (!name) nextErrors.name = 'Enter a plant name before saving.'
    if (!careNote && recommendations.length === 0) {
      nextErrors.careNote = 'Add a care note: choose a recommendation or type your own.'
    }
    if (water.error) nextErrors.waterEveryDays = water.error
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const firstInvalid = nextErrors.name ? 'plant-name'
        : nextErrors.careNote ? 'care-recommendations' : 'plant-water-every'
      document.getElementById(firstInvalid)?.focus()
      return
    }
    onSubmit({ name, careNote, lastWatered, recommendations, waterEveryDays: water.value, photo })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="plant-name">Plant name <span aria-hidden="true">*</span></label>
      <input id="plant-name" name="name" value={form.name} onChange={handleChange} ref={nameRef}
        list="plant-type-options" autoComplete="off"
        maxLength={80} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : 'name-help'} />
      <datalist id="plant-type-options">
        {PLANT_TYPES.map((type) => <option key={type} value={type} />)}
      </datalist>
      {errors.name ? <p className="error" id="name-error" role="alert">{errors.name}</p> :
        <p className="hint" id="name-help">Required. Pick an indoor plant from the list or type your own name. Keep it under 80 characters.</p>}

      <label id="care-recommendations-label" htmlFor="care-recommendations">Care note <span aria-hidden="true">*</span></label>
      <MultiSelect id="care-recommendations" labelId="care-recommendations-label" options={CARE_RECOMMENDATIONS}
        value={form.recommendations} placeholder="Choose care recommendations" groupLabel="Care recommendations"
        invalid={Boolean(errors.careNote)} describedBy={errors.careNote ? 'care-note-error' : 'care-note-help'}
        onChange={(recommendations) => {
          setForm((current) => ({ ...current, recommendations }))
          if (recommendations.length > 0) setErrors((current) => ({ ...current, careNote: '' }))
        }} />

      <label className="sub-label" htmlFor="plant-care-note">Other care</label>
      <textarea id="plant-care-note" name="careNote" value={form.careNote} onChange={handleChange}
        rows="3" maxLength={240} aria-invalid={Boolean(errors.careNote)}
        aria-describedby={errors.careNote ? 'care-note-error' : 'care-note-help'} />
      {errors.careNote ? <p className="error" id="care-note-error" role="alert">{errors.careNote}</p> :
        <p className="hint" id="care-note-help">Required: choose at least one recommendation or type your own care above. Choose as many recommendations as apply. Do not enter sensitive personal information.</p>}

      <div className="field-row">
        <div>
          <label htmlFor="plant-last-watered">Last watered</label>
          <input id="plant-last-watered" name="lastWatered" type="date" value={form.lastWatered}
            onChange={handleChange} max={todayString()} aria-describedby="last-watered-help" />
          <p className="hint" id="last-watered-help">Optional.</p>
        </div>
        <div>
          <label htmlFor="plant-water-every">Water every (days)</label>
          <input id="plant-water-every" name="waterEveryDays" type="number" inputMode="numeric" min="1" max="365"
            value={form.waterEveryDays} onChange={handleChange} aria-invalid={Boolean(errors.waterEveryDays)}
            aria-describedby={errors.waterEveryDays ? 'water-every-error' : 'water-every-help'} />
          {errors.waterEveryDays ? <p className="error" id="water-every-error" role="alert">{errors.waterEveryDays}</p> :
            <p className="hint" id="water-every-help">Optional. Shows when watering is due.</p>}
        </div>
      </div>

      <label htmlFor="plant-photo">Photo</label>
      <input id="plant-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto}
        ref={fileRef} aria-invalid={Boolean(errors.photo)} aria-describedby={errors.photo ? 'photo-error' : 'photo-help'} />
      {errors.photo ? <p className="error" id="photo-error" role="alert">{errors.photo}</p> :
        <p className="hint" id="photo-help">Optional. The photo is shrunk and saved in this browser only.</p>}
      {photoBusy && <p className="hint" role="status">Processing photo…</p>}
      {form.photo && (
        <div className="photo-preview">
          <img src={form.photo} alt="Selected plant" />
          <button type="button" className="secondary" onClick={removePhoto}>Remove photo</button>
        </div>
      )}

      <div className="actions">
        <button type="submit" disabled={photoBusy}>{editing ? 'Save changes' : 'Save plant'}</button>
        {editing && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
