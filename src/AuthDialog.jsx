import { useEffect, useId, useRef, useState } from 'react'
import { MIN_PASSWORD, deleteUserByEmail, guestPlantCount, registerUser, signInUser } from './accounts.js'
import { LeafIcon } from './icons.jsx'

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

export default function AuthDialog({ initialTab = 'signin', onClose, onAuthenticated }) {
  const uid = useId()
  const dialogRef = useRef(null)
  const [tab, setTab] = useState(initialTab)
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
  const titleId = `${uid}-title`

  // Move focus into the dialog, keep the page behind it still, and put focus back on close.
  useEffect(() => {
    const opener = document.activeElement
    document.body.classList.add('dialog-open')
    return () => {
      document.body.classList.remove('dialog-open')
      opener?.focus?.()
    }
  }, [])

  useEffect(() => {
    dialogRef.current?.querySelector('form input')?.focus()
  }, [tab])

  function chooseTab(next) {
    setTab(next)
    setErrors({})
    setShowForgot(false)
    setRemoved('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...dialogRef.current.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => (!element.disabled && element.offsetParent !== null) || element === document.activeElement)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
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
    <div className="auth-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} onKeyDown={handleKeyDown}>
        <button type="button" className="secondary auth-close" aria-label="Close" onClick={onClose}>×</button>

        <div className="auth-head">
          <span className="brand-mark"><LeafIcon size={20} /></span>
          <div>
            <h2 id={titleId}>{registering ? 'Create your account' : 'Welcome back'}</h2>
            <p className="hint">
              {registering ? 'Keep your plants in your own space on this device.' : 'Sign in to open your plants.'}
            </p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" aria-selected={!registering} className={!registering ? 'is-active' : ''}
            onClick={() => chooseTab('signin')}>Sign in</button>
          <button type="button" role="tab" aria-selected={registering} className={registering ? 'is-active' : ''}
            onClick={() => chooseTab('register')}>Create account</button>
        </div>

        {removed && <p className="notice" role="status">{removed}</p>}

        <form onSubmit={submit} noValidate aria-label={registering ? 'Create account' : 'Sign in'} role="tabpanel">
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
            <button type="button" className="secondary" onClick={onClose}>Continue as guest</button>
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
      </div>
    </div>
  )
}
