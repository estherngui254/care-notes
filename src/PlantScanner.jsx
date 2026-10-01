import { useRef, useState } from 'react'
import { DEFAULT_PROVIDER, MAX_PHOTOS, PROVIDERS, friendlyError, identifyPlant } from './identify.js'
import { KIND_LABELS, findProblem } from './pestsAndDiseases.js'
import { compressImage, resizeDataUrl } from './photo.js'
import { todayString } from './plantUtils.js'
import { plantFromScan } from './scanToPlant.js'
import { readApiKey, readProvider, writeApiKey, writeProvider } from './storage.js'

const ANALYSIS_SIZE = 1024
const OVERALL_LABELS = {
  healthy: 'Looks healthy',
  minor_issues: 'Minor issues',
  needs_attention: 'Needs attention',
  unclear: 'Hard to tell',
}
const CARE_ROWS = [
  ['light', 'Light'],
  ['water', 'Water'],
  ['humidity', 'Humidity'],
  ['temperature', 'Temperature'],
  ['soil', 'Soil'],
  ['fertiliser', 'Fertiliser'],
  ['petSafety', 'Pets'],
]

function KeySetup({ initialProvider, onSave }) {
  const [provider, setProvider] = useState(initialProvider)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const info = PROVIDERS[provider]

  function handleSubmit(event) {
    event.preventDefault()
    const key = value.trim()
    if (!key) {
      setError('Paste your API key first.')
      return
    }
    if (!writeApiKey(provider, key)) {
      setError('This browser could not store the key. It will be forgotten when you leave.')
    }
    writeProvider(provider)
    onSave(provider, key)
  }

  return (
    <form className="key-form" onSubmit={handleSubmit} noValidate>
      <p>Identifying a plant from a photo uses an AI service, so it needs your own API key. Choose a service:</p>
      <fieldset className="category">
        <legend className="visually-hidden">AI service</legend>
        {Object.values(PROVIDERS).map((option) => (
          <label key={option.id} className="radio">
            <input type="radio" name="scan-provider" value={option.id} checked={provider === option.id}
              onChange={() => { setProvider(option.id); setError('') }} />
            {option.label}
          </label>
        ))}
      </fieldset>

      {provider === 'gemini' ? (
        <>
          <p>
            Get a free key at <a href={info.keyUrl} target="_blank" rel="noreferrer">Google AI Studio</a> (sign in with a Google account,
            then choose Create API key). No payment details are needed.
          </p>
          <ul className="hint-list">
            <li>On the free tier, Google may use your photos and the answers to improve its products. Do not use photos you want to keep private.</li>
            <li>There are daily and per-minute limits, and the free tier is not available in every country.</li>
          </ul>
        </>
      ) : (
        <>
          <p>
            Create a key in the <a href={info.keyUrl} target="_blank" rel="noreferrer">Anthropic Console</a>. Claude is paid, about a few
            cents a scan, so set a low spend limit on the key.
          </p>
          <ul className="hint-list">
            <li>Photos are sent to Anthropic for analysis.</li>
          </ul>
        </>
      )}
      <ul className="hint-list">
        <li>The key is saved only in this browser, and is never included in exports.</li>
        <li>Photos are sent only when you select Identify.</li>
        <li>Anyone who can use this browser can use the key, so avoid shared computers.</li>
      </ul>
      <label htmlFor="scan-api-key">{info.short} API key</label>
      <input id="scan-api-key" type="password" autoComplete="off" spellCheck="false" value={value}
        placeholder={info.keyHint} onChange={(event) => { setValue(event.target.value); setError('') }}
        aria-invalid={Boolean(error)} aria-describedby={error ? 'scan-key-error' : undefined} />
      {error && <p className="error" id="scan-key-error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit">Save key</button>
      </div>
    </form>
  )
}

function Finding({ finding }) {
  const problem = findProblem(finding.matchedProblem)
  return (
    <li className="finding">
      <p className="issue-head">
        <strong>{finding.name}</strong>
        <span className="kind">{problem ? KIND_LABELS[problem.kind] : KIND_LABELS[finding.type] ?? 'Other'}</span>
        <span className="state state-done">{finding.confidence} confidence</span>
      </p>
      {finding.signs && <p>{finding.signs}</p>}
      {finding.actions.length > 0 && (
        <ul>
          {finding.actions.map((action) => <li key={action}>{action}</li>)}
        </ul>
      )}
    </li>
  )
}

function Result({ result }) {
  const { plant, care, health } = result
  return (
    <div className="scan-result" role="region" aria-label="Scan result">
      {plant.identified ? (
        <>
          <h3 className="scan-name">{plant.commonName}</h3>
          {plant.scientificName && <p className="scan-latin">{plant.scientificName}</p>}
          <p className="hint">
            Confidence: {plant.confidence}.
            {plant.alternatives.length > 0 && ` It could also be: ${plant.alternatives.join(', ')}.`}
          </p>

          <h4>Care requirements</h4>
          <dl className="care-grid">
            {CARE_ROWS.filter(([key]) => care[key]).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{care[key]}</dd>
              </div>
            ))}
            {care.waterEveryDays && (
              <div>
                <dt>Water every</dt>
                <dd>about {care.waterEveryDays} {care.waterEveryDays === 1 ? 'day' : 'days'}</dd>
              </div>
            )}
          </dl>
          {care.recommendations.length > 0 && (
            <ul className="chips" aria-label="Care recommendations">
              {care.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </>
      ) : (
        <p className="notice" role="status">The plant could not be identified from these photos.</p>
      )}

      <h4>Health check</h4>
      <p className={`status status-${health.overall === 'healthy' ? 'ok' : health.overall === 'needs_attention' ? 'overdue' : 'info'}`}>
        {OVERALL_LABELS[health.overall]}
      </p>
      {health.summary && <p>{health.summary}</p>}
      {health.findings.length > 0 && (
        <ul className="finding-list" aria-label="Health findings">
          {health.findings.map((finding) => <Finding key={`${finding.type}-${finding.name}`} finding={finding} />)}
        </ul>
      )}
      {result.photoAdvice && <p className="tip">{result.photoAdvice}</p>}
      <p className="hint">
        This is an AI estimate from photos, so it can be wrong. Compare it with the guide below, and ask a local nursery
        if you are unsure. Follow product labels and keep treatments away from pets and children.
      </p>
    </div>
  )
}

export default function PlantScanner({ onSavePlant, identify = identifyPlant }) {
  const [provider, setProvider] = useState(readProvider)
  const [apiKey, setApiKey] = useState(() => readApiKey(readProvider()))
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [savedName, setSavedName] = useState('')
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)

  async function addFiles(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    setError('')
    setBusy(true)
    try {
      const room = MAX_PHOTOS - photos.length
      const added = []
      for (const file of files.slice(0, room)) added.push(await compressImage(file, ANALYSIS_SIZE))
      setPhotos((current) => [...current, ...added])
      setResult(null)
      setSavedName('')
      if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos. The extra ones were skipped.`)
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  function removePhoto(index) {
    setPhotos((current) => current.filter((_, position) => position !== index))
    setResult(null)
    setSavedName('')
  }

  async function scan() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('You are offline. Identifying a plant needs an internet connection.')
      return
    }
    setError('')
    setResult(null)
    setSavedName('')
    setBusy(true)
    try {
      setResult(await identify({ provider, apiKey, images: photos }))
    } catch (problem) {
      setError(friendlyError(problem))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      const [photo, issuePhoto] = await Promise.all([
        resizeDataUrl(photos[0], 480),
        resizeDataUrl(photos[0], 360),
      ])
      const plant = plantFromScan(result, { photo, issuePhoto, date: todayString() })
      onSavePlant(plant)
      setSavedName(plant.name)
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setPhotos([])
    setResult(null)
    setError('')
    setSavedName('')
  }

  function removeKey() {
    writeApiKey(provider, '')
    setApiKey('')
    startOver()
  }

  function saveKey(chosen, key) {
    setProvider(chosen)
    setApiKey(key)
  }

  return (
    <section className="panel scanner no-print" aria-labelledby="scan-heading">
      <h2 id="scan-heading">Identify a plant from a photo</h2>
      <p className="hint">
        Take or choose up to {MAX_PHOTOS} photos of one plant: the whole plant, a close-up of a leaf, and any problem area.
        You get its name, care needs and a health check.
      </p>

      {!apiKey ? (
        <KeySetup initialProvider={provider ?? DEFAULT_PROVIDER} onSave={saveKey} />
      ) : (
        <>
          <div className="actions scan-actions">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
              aria-label="Take a photo" onChange={addFiles} />
            <input ref={libraryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
              aria-label="Choose photos" onChange={addFiles} />
            <button type="button" className="secondary" disabled={busy || photos.length >= MAX_PHOTOS}
              onClick={() => cameraRef.current?.click()}>Take photo</button>
            <button type="button" className="secondary" disabled={busy || photos.length >= MAX_PHOTOS}
              onClick={() => libraryRef.current?.click()}>Choose photos</button>
          </div>

          {photos.length > 0 && (
            <ul className="scan-photos" aria-label="Photos to analyse">
              {photos.map((photo, index) => (
                <li key={photo.slice(-24) + index}>
                  <img src={photo} alt={`Photo ${index + 1} of the plant`} />
                  <button type="button" className="secondary" aria-label={`Remove photo ${index + 1}`}
                    onClick={() => removePhoto(index)}>Remove</button>
                </li>
              ))}
            </ul>
          )}

          <div className="actions">
            <button type="button" disabled={busy || photos.length === 0} onClick={scan}>
              {busy ? 'Working…' : 'Identify and check health'}
            </button>
            {photos.length > 0 && <button type="button" className="secondary" disabled={busy} onClick={startOver}>Clear</button>}
          </div>
          <p className="hint">
            Your photos are sent to {PROVIDERS[provider].company} ({PROVIDERS[provider].short}) for analysis when you select Identify.
            {provider === 'gemini' && ' On the free tier Google may use them to improve its products.'}
          </p>
        </>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {busy && photos.length > 0 && <p className="hint" role="status">Working on it. This can take up to a minute.</p>}

      {result && <Result result={result} />}

      {result?.plant.identified && !savedName && (
        <div className="actions">
          <button type="button" disabled={busy} onClick={save}>Save as a plant</button>
        </div>
      )}
      {savedName && (
        <p className="notice" role="status">
          Saved {savedName} to your plants. Its care requirements and any problems found are on its card.
          <button type="button" className="secondary" onClick={startOver}>Scan another</button>
        </p>
      )}

      {apiKey && (
        <p className="hint key-note">
          Using {PROVIDERS[provider].short}. API key saved on this device.{' '}
          <button type="button" className="link" onClick={removeKey}>Remove key</button>
        </p>
      )}
    </section>
  )
}
