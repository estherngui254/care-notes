import { useEffect, useId, useRef, useState } from 'react'
import { MIN_PASSWORD, deleteUserByEmail, guestPlantCount, readUsers, registerUser, signInUser } from './accounts.js'
import { CameraIcon, DropIcon, LeafIcon, MoonIcon, PlantArt, SproutIcon, SunIcon } from './icons.jsx'

function PasswordField({ id, label, value, onChange, error, hint, autoComplete }) {
  const [shown, setShown] = useState(false)
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input id={id} type={shown ? 'text' : 'password'} value={value} autoComplete={autoComplete}
          spellCheck="false" maxLength={128} aria-invalid={Boolean(error)} aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="secondary password-toggle" aria-pressed={shown}
          aria-label={`${shown ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setShown((current) => !current)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <p className="error" id={`${id}-error`} role="alert">{error}</p>
        : hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
    </>
  )
}

function TextField({ id, label, value, onChange, error, type = 'text', autoComplete, maxLength = 80 }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} autoComplete={autoComplete} maxLength={maxLength}
        spellCheck="false" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)} />
      {error && <p className="error" id={`${id}-error`} role="alert">{error}</p>}
    </>
  )
}

const POINTS = [
  [CameraIcon, 'Identify a plant from a photo', 'Get its name, care needs and a health check.'],
  [DropIcon, 'Never forget a watering', 'Track when each plant was watered and what is due.'],
  [SproutIcon, 'Keep every plant in one place', 'Care notes, photos, problems and how you managed them.'],
]

// The first thing anyone sees. Nothing else in the app is shown until they sign in or register.
export default function AuthScreen({ onAuthenticated, theme, onToggleTheme }) {
  const uid = useId()
  const formRef = useRef(null)
  const [tab, setTab] = useState(() => (readUsers().length > 0 ? 'signin' : 'register'))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [guestCount] = useState(guestPlantCount)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [adopt, setAdopt] = useState(true)

  const [showForgot, setShowForgot] = useState(false)
  const [removeEmail, setRemoveEmail] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [removed, setRemoved] = useState('')

  const registering = tab === 'register'

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus()
  }, [tab])

  function chooseTab(next) {
    setTab(next)
    setErrors({})
    setShowForgot(false)
    setRemoved('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      if (registering) {
        const result = await registerUser({ name, email, password, confirm, remember, adoptGuestPlants: adopt && guestCount > 0 })
        if (result.errors) setErrors(result.errors)
        else onAuthenticated(result.user, { created: true, moved: result.moved })
      } else {
        const result = await signInUser({ email, password, remember })
        if (result.error) setErrors({ form: result.error })
        else onAuthenticated(result.user, { created: false, moved: 0 })
      }
    } finally {
      setBusy(false)
    }
  }

  function removeAccount() {
    if (deleteUserByEmail(removeEmail)) {
      setRemoved(`The account for ${removeEmail.trim()} was removed from this device. You can now create it again.`)
      setEmail(removeEmail.trim())
      setPassword('')
      setConfirm('')
      setShowForgot(false)
      setTab('register')
      setUnderstood(false)
      setRemoveEmail('')
    } else {
      setErrors({ remove: 'No account with that email was found on this device.' })
    }
  }

  return (
    <div className="gate">
      <header className="gate-bar">
        <a className="brand" href="#top">
          <span className="brand-mark"><LeafIcon size={18} /></span>
          <span className="brand-name">Plant Care Notes</span>
        </a>
        <button type="button" className="secondary theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </header>

      <main className="gate-main" id="top">
        <section className="hero gate-hero" aria-labelledby="gate-title">
          <div className="hero-copy">
            <p className="eyebrow">Your houseplant journal</p>
            <h1 id="gate-title">Plant Care Notes</h1>
            <p className="intro">Sign in or create an account to open your plants. Everything stays private to your account.</p>
            <ul className="gate-points">
              {POINTS.map(([Icon, title, text]) => (
                <li key={title}>
                  <span className="gate-point-icon"><Icon size={20} /></span>
                  <span><strong>{title}</strong><span>{text}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <PlantArt className="hero-art" />
        </section>

        <section className="gate-card" aria-labelledby={`${uid}-title`}>
          <h2 id={`${uid}-title`}>{registering ? 'Create your account' : 'Welcome back'}</h2>
          <p className="hint gate-lead">
            {registering ? 'It takes a minute. You need an account to see and edit plants.' : 'Sign in to open your plants.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={!registering} className={!registering ? 'is-active' : ''}
              onClick={() => chooseTab('signin')}>Sign in</button>
            <button type="button" role="tab" aria-selected={registering} className={registering ? 'is-active' : ''}
              onClick={() => chooseTab('register')}>Create account</button>
          </div>

          {removed && <p className="notice" role="status">{removed}</p>}

          <form ref={formRef} onSubmit={submit} noValidate aria-label={registering ? 'Create account' : 'Sign in'} role="tabpanel">
            {registering && (
              <TextField id={`${uid}-name`} label="Name" value={name} onChange={setName} error={errors.name}
                autoComplete="name" maxLength={40} />
            )}
            <TextField id={`${uid}-email`} label="Email" type="email" value={email} onChange={setEmail}
              error={errors.email} autoComplete={registering ? 'email' : 'username'} />
            <PasswordField id={`${uid}-password`} label="Password" value={password} onChange={setPassword}
              error={errors.password} autoComplete={registering ? 'new-password' : 'current-password'}
              hint={registering ? `Use at least ${MIN_PASSWORD} characters. Do not reuse a password from another site.` : undefined} />
            {registering && (
              <PasswordField id={`${uid}-confirm`} label="Confirm password" value={confirm} onChange={setConfirm}
                error={errors.confirm} autoComplete="new-password" />
            )}

            <label className="check">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              Keep me signed in on this device
            </label>
            {registering && guestCount > 0 && (
              <label className="check">
                <input type="checkbox" checked={adopt} onChange={(event) => setAdopt(event.target.checked)} />
                Add the {guestCount} {guestCount === 1 ? 'plant' : 'plants'} already saved on this device to my account
              </label>
            )}

            {errors.form && <p className="error" role="alert">{errors.form}</p>}

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
              </button>
            </div>
          </form>

          {!registering && (
            <div className="auth-forgot">
              <button type="button" className="link" aria-expanded={showForgot} onClick={() => setShowForgot((current) => !current)}>
                Forgot your password?
              </button>
              {showForgot && (
                <div className="forgot-panel">
                  <p>
                    Accounts live only on this device, so there is no email to reset a password. The only way back in is to
                    remove the account and create it again. <strong>That deletes the plants saved in it.</strong>
                  </p>
                  <label htmlFor={`${uid}-remove`}>Email of the account to remove</label>
                  <input id={`${uid}-remove`} type="email" value={removeEmail} autoComplete="off"
                    onChange={(event) => { setRemoveEmail(event.target.value); setErrors({}) }}
                    aria-invalid={Boolean(errors.remove)} aria-describedby={errors.remove ? `${uid}-remove-error` : undefined} />
                  {errors.remove && <p className="error" id={`${uid}-remove-error`} role="alert">{errors.remove}</p>}
                  <label className="check">
                    <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
                    I understand the plants in this account will be deleted
                  </label>
                  <button type="button" className="danger" disabled={!removeEmail.trim() || !understood} onClick={removeAccount}>
                    Remove account
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="hint auth-note">
            Accounts are stored in this browser only. They keep each person's plants separate and ask for a password,
            but they do not sync between devices. Export a backup now and then.
          </p>
        </section>
      </main>
    </div>
  )
}
