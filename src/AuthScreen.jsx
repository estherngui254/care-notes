import { useEffect, useId, useRef, useState } from 'react'
import { resendConfirmation, sendPasswordReset, setNewPassword, signInPerson, signUpPerson } from './auth.js'
import { MIN_PASSWORD } from './validation.js'
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
  [SproutIcon, 'Your plants on every device', 'Sign in on your phone or computer and they are there.'],
]

function GateFrame({ theme, onToggleTheme, intro, children }) {
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
            <p className="intro">{intro}</p>
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
        {children}
      </main>
    </div>
  )
}

// Shown after someone opens the link in a password-reset email.
export function SetNewPassword({ onDone, theme, onToggleTheme }) {
  const uid = useId()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    const result = await setNewPassword(password)
    setBusy(false)
    if (result.error) setError(result.error)
    else onDone(result.person)
  }

  return (
    <GateFrame theme={theme} onToggleTheme={onToggleTheme} intro="Choose a new password to finish resetting your account.">
      <section className="gate-card" aria-labelledby={`${uid}-title`}>
        <h2 id={`${uid}-title`}>Choose a new password</h2>
        <p className="hint gate-lead">You opened the link from your email, so you can set a new password now.</p>
        <form onSubmit={submit} noValidate aria-label="Set a new password">
          <PasswordField id={`${uid}-new`} label="New password" value={password} onChange={setPassword}
            autoComplete="new-password" hint={`Use at least ${MIN_PASSWORD} characters. Do not reuse a password from another site.`} />
          <PasswordField id={`${uid}-confirm`} label="Confirm new password" value={confirm} onChange={setConfirm}
            autoComplete="new-password" />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Save new password'}</button>
          </div>
        </form>
      </section>
    </GateFrame>
  )
}

// The first thing anyone sees. Nothing else in the app is shown until they sign in or register.
export default function AuthScreen({ onAuthenticated, theme, onToggleTheme, initialTab = 'register' }) {
  const uid = useId()
  const formRef = useRef(null)
  const [tab, setTab] = useState(initialTab)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [confirmEmail, setConfirmEmail] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [note, setNote] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState('')

  const registering = tab === 'register'

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus()
  }, [tab, confirmEmail])

  function chooseTab(next) {
    setTab(next)
    setPassword('')
    setConfirm('')
    setErrors({})
    setShowForgot(false)
    setConfirmEmail('')
    setUnconfirmed(false)
    setNote('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    setNote('')
    try {
      if (registering) {
        const result = await signUpPerson({ name, email, password, confirm })
        if (result.errors) setErrors(result.errors)
        else if (result.needsConfirmation) setConfirmEmail(result.email)
        else onAuthenticated(result.person, { created: true })
      } else {
        const result = await signInPerson({ email, password })
        if (result.error) {
          setErrors({ form: result.error })
          setUnconfirmed(Boolean(result.unconfirmed))
        } else {
          onAuthenticated(result.person, { created: false })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function resend(address) {
    setBusy(true)
    const result = await resendConfirmation(address)
    setBusy(false)
    setNote(result.error ?? `We sent another email to ${address}. It can take a few minutes. Check your spam folder too.`)
  }

  async function sendReset() {
    setBusy(true)
    setResetError('')
    setNote('')
    const result = await sendPasswordReset(resetEmail)
    setBusy(false)
    if (result.error) setResetError(result.error)
    else setNote(`If an account exists for ${resetEmail.trim()}, a reset link is on its way. It can take a few minutes. Check your spam folder too.`)
  }

  if (confirmEmail) {
    return (
      <GateFrame theme={theme} onToggleTheme={onToggleTheme} intro="One more step: confirm your email address, then sign in.">
        <section className="gate-card" aria-labelledby={`${uid}-confirm-title`}>
          <h2 id={`${uid}-confirm-title`}>Check your email</h2>
          <p className="hint gate-lead">
            We sent a link to <strong>{confirmEmail}</strong>. Open it to confirm your account, then come back here and sign in.
          </p>
          <p className="hint">
            Nothing arrived? It can take a few minutes, and it may be in your spam folder. If you already registered with
            this address, no new link is sent, so sign in or reset your password instead.
          </p>
          {note && <p className="notice" role="status">{note}</p>}
          <div className="actions stacked">
            <button type="button" disabled={busy} onClick={() => resend(confirmEmail)}>Send the email again</button>
            <button type="button" className="secondary" onClick={() => { setEmail(confirmEmail); chooseTab('signin') }}>
              I confirmed it, go to sign in
            </button>
          </div>
        </section>
      </GateFrame>
    )
  }

  return (
    <GateFrame theme={theme} onToggleTheme={onToggleTheme}
      intro="Sign in or create an account to open your plants. Everything stays private to your account.">
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

        {note && <p className="notice" role="status">{note}</p>}

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

          {errors.form && <p className="error" role="alert">{errors.form}</p>}
          {unconfirmed && (
            <button type="button" className="link" disabled={busy} onClick={() => resend(email)}>
              Send the confirmation email again
            </button>
          )}

          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
            </button>
          </div>
          {registering && <p className="hint">We will email you a link to confirm your address before you can sign in.</p>}
        </form>

        {!registering && (
          <div className="auth-forgot">
            <button type="button" className="link" aria-expanded={showForgot}
              onClick={() => { setShowForgot((current) => !current); setResetEmail(email); setResetError('') }}>
              Forgot your password?
            </button>
            {showForgot && (
              <div className="forgot-panel">
                <p>Enter your email and we will send you a link to choose a new password.</p>
                <TextField id={`${uid}-reset`} label="Email for the reset link" type="email" value={resetEmail}
                  onChange={(value) => { setResetEmail(value); setResetError('') }} error={resetError} autoComplete="email" />
                <button type="button" disabled={busy || !resetEmail.trim()} onClick={sendReset}>Email me a reset link</button>
              </div>
            )}
          </div>
        )}

        <p className="hint auth-note">
          Your account and plants are stored online, so they follow you to any device. Your password is never stored
          by this app. Do not store anything sensitive in your notes.
        </p>
      </section>
    </GateFrame>
  )
}
