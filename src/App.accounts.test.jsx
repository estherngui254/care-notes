import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { SITE_URL } from './site.js'
import { fakeSupabase } from './test/fakeSupabase.js'

const setup = () => ({ user: userEvent.setup({ applyAccept: false }), ...render(<App />) })
const panel = () => within(screen.getByRole('tabpanel'))
const NEW = { name: 'Amina', email: 'amina@example.com', password: 'correct horse' }

async function fillRegistration(user, { name = NEW.name, email = NEW.email, password = NEW.password, confirm = password } = {}) {
  await user.click(screen.getByRole('tab', { name: 'Create account' }))
  await user.type(panel().getByLabelText('Name'), name)
  await user.type(panel().getByLabelText('Email'), email)
  await user.type(panel().getByLabelText('Password'), password)
  await user.type(panel().getByLabelText('Confirm password'), confirm)
  await user.click(panel().getByRole('button', { name: 'Create account' }))
}

async function signIn(user, { email = NEW.email, password = NEW.password } = {}) {
  await user.click(screen.getByRole('tab', { name: 'Sign in' }))
  await user.type(panel().getByLabelText('Email'), email)
  await user.type(panel().getByLabelText('Password'), password)
  await user.click(panel().getByRole('button', { name: 'Sign in' }))
}

const existingAccount = (overrides = {}) => fakeSupabase.addUser({ name: NEW.name, email: NEW.email, password: NEW.password, ...overrides })
const signOut = (user) => user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
const appIsHidden = () => expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()

describe('nothing is shown until someone signs in', () => {
  it('shows only the sign-in page to a visitor who is not signed in', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Plant Care Notes' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText(/sign in or create an account to open your plants/i)).toBeInTheDocument()
    appIsHidden()
    expect(screen.queryByRole('button', { name: /save plant/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/no plants saved yet/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /pest, disease and nutrient guide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /buy plants/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /identify a plant/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('does not ask the server for any plants while signed out', () => {
    setup()
    expect(fakeSupabase.state.calls.filter(([operation]) => operation === 'select')).toEqual([])
  })

  it('offers no way to carry on without an account', () => {
    setup()
    expect(screen.queryByText(/guest/i)).not.toBeInTheDocument()
  })

  it('starts on Create account for a first visit and on Sign in for a returning one', () => {
    const first = setup()
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true')
    first.unmount()

    window.localStorage.setItem('plant-care-notes-has-account', 'yes')
    setup()
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
    expect(panel().getByLabelText('Email')).toHaveFocus()
  })

  it('has a theme button on the sign-in page too', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /dark mode/i }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('plant-care-notes-theme')).toBe('dark')
  })
})

describe('registering', () => {
  it('asks the person to confirm their email, and sends nothing to sign in yet', async () => {
    const { user } = setup()
    await fillRegistration(user)
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(NEW.email)).toBeInTheDocument()
    expect(fakeSupabase.state.emails).toEqual([{ type: 'signup', email: NEW.email }])
    expect(fakeSupabase.state.calls[0][2]).toMatchObject({ data: { name: 'Amina' }, emailRedirectTo: SITE_URL })
    appIsHidden()
    expect(fakeSupabase.state.session).toBeNull()
  })

  it('lets them resend the email and then sign in once it is confirmed', async () => {
    const { user } = setup()
    await fillRegistration(user)
    await user.click(await screen.findByRole('button', { name: 'Send the email again' }))
    expect(await screen.findByText(/we sent another email to amina@example.com/i)).toBeInTheDocument()
    expect(fakeSupabase.state.emails.map((mail) => mail.type)).toEqual(['signup', 'resend-signup'])

    fakeSupabase.confirm(NEW.email)
    await user.click(screen.getByRole('button', { name: 'I confirmed it, go to sign in' }))
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
    expect(panel().getByLabelText('Email')).toHaveValue(NEW.email)
    await user.type(panel().getByLabelText('Password'), NEW.password)
    await user.click(panel().getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
  })

  it('opens the app straight away when the project does not require confirmation', async () => {
    fakeSupabase.state.confirmRequired = false
    const { user } = setup()
    await fillRegistration(user)
    expect(await screen.findByText(/welcome, amina\. your account is ready/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
    expect(document.querySelector('.hero-account')).toHaveTextContent('Signed in as Amina')
  })

  it('explains each problem with the form without contacting the server', async () => {
    const { user } = setup()
    await user.click(panel().getByRole('button', { name: 'Create account' }))
    expect(panel().getByText('Enter your name.')).toBeInTheDocument()
    expect(panel().getByText('Enter your email address.')).toBeInTheDocument()
    expect(panel().getByText('Choose a password.')).toBeInTheDocument()

    await user.type(panel().getByLabelText('Name'), 'Amina')
    await user.type(panel().getByLabelText('Email'), 'amina@')
    await user.type(panel().getByLabelText('Password'), 'short')
    await user.click(panel().getByRole('button', { name: 'Create account' }))
    expect(panel().getByText(/valid email address/i)).toBeInTheDocument()
    expect(panel().getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(panel().getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(fakeSupabase.state.calls).toEqual([])
  })

  it('catches a password typed differently the second time', async () => {
    const { user } = setup()
    await fillRegistration(user, { confirm: 'something else' })
    expect(panel().getByText('The passwords do not match.')).toBeInTheDocument()
    expect(fakeSupabase.state.calls).toEqual([])
  })

  it('answers the same way for an email that already has an account', async () => {
    existingAccount()
    const { user } = setup()
    await fillRegistration(user)
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.queryByText(/account with this email already exists/i)).not.toBeInTheDocument()
    expect(fakeSupabase.state.emails).toEqual([])
  })

  it('reports a password the service refuses', async () => {
    const { user } = setup()
    fakeSupabase.state.calls.length = 0
    // The fake only rejects sign-ups through the update path, so check the form-level message instead.
    fakeSupabase.state.offline = true
    await fillRegistration(user)
    expect(await panel().findByText(/could not reach the server/i)).toBeInTheDocument()
  })

  it('shows and hides the password', async () => {
    const { user } = setup()
    await user.type(panel().getByLabelText('Password'), 'visible pass')
    expect(panel().getByLabelText('Password')).toHaveAttribute('type', 'password')
    await user.click(panel().getByRole('button', { name: 'Show password' }))
    expect(panel().getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.click(panel().getByRole('button', { name: 'Hide password' }))
    expect(panel().getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})

describe('signing in and out', () => {
  it('signs in with the right password and opens the app', async () => {
    existingAccount()
    const { user } = setup()
    await signIn(user)
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
    expect(document.querySelector('.hero-account')).toHaveTextContent('Signed in as Amina')
  })

  it('does not say whether the email or the password was wrong', async () => {
    existingAccount()
    const { user } = setup()
    await signIn(user, { password: 'wrong password' })
    expect(await panel().findByRole('alert')).toHaveTextContent(/do not match an account/i)
    appIsHidden()
    await user.clear(panel().getByLabelText('Email'))
    await user.type(panel().getByLabelText('Email'), 'nobody@example.com')
    await user.click(panel().getByRole('button', { name: 'Sign in' }))
    expect(await panel().findByRole('alert')).toHaveTextContent(/do not match an account/i)
  })

  it('tells someone who has not confirmed their email, and can resend it', async () => {
    existingAccount({ confirmed: false })
    const { user } = setup()
    await signIn(user)
    expect(await panel().findByRole('alert')).toHaveTextContent(/confirm your email first/i)
    appIsHidden()
    await user.click(screen.getByRole('button', { name: 'Send the confirmation email again' }))
    expect(await screen.findByText(/we sent another email/i)).toBeInTheDocument()
    expect(fakeSupabase.state.emails.map((mail) => mail.type)).toEqual(['resend-signup'])
  })

  it('explains when the server cannot be reached', async () => {
    existingAccount()
    fakeSupabase.state.offline = true
    const { user } = setup()
    await signIn(user)
    expect(await panel().findByRole('alert')).toHaveTextContent(/could not reach the server/i)
  })

  it('requires both fields', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Sign in' }))
    await user.click(panel().getByRole('button', { name: 'Sign in' }))
    expect(await panel().findByRole('alert')).toHaveTextContent(/enter your email and password/i)
    expect(fakeSupabase.state.calls).toEqual([])
  })

  it('signing out hides everything again, and signing back in restores it', async () => {
    const account = existingAccount()
    const { user } = setup()
    await signIn(user)
    await screen.findByText(/welcome back/i)
    await user.type(screen.getByLabelText(/plant name/i), 'Amina Fern')
    await user.type(screen.getByLabelText(/other care/i), 'Mist daily')
    await user.click(screen.getByRole('button', { name: /save plant/i }))
    expect(screen.getByText('Amina Fern')).toBeInTheDocument()

    await signOut(user)
    expect(await screen.findByText('You are signed out.')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.queryByText('Amina Fern')).not.toBeInTheDocument()
    appIsHidden()
    expect(fakeSupabase.rowsFor(account.id).map((row) => row.data.name)).toEqual(['Amina Fern'])

    await signIn(user)
    expect(await screen.findByText('Amina Fern')).toBeInTheDocument()
  })

  it('stays signed in after a reload, and not after signing out', async () => {
    existingAccount()
    const { user, unmount } = setup()
    await signIn(user)
    await screen.findByText(/welcome back/i)
    unmount()
    const again = render(<App />)
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()

    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    await screen.findByRole('tablist', { name: 'Account' })
    again.unmount()
    render(<App />)
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    appIsHidden()
  })

  it('goes back to the sign-in page when the session ends elsewhere', async () => {
    const account = existingAccount()
    fakeSupabase.signInAs(account)
    render(<App />)
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
    await fakeSupabase.client.auth.signOut()
    expect(await screen.findByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    appIsHidden()
  })
})

describe('forgotten passwords', () => {
  async function openForgot(user) {
    await user.click(screen.getByRole('tab', { name: 'Sign in' }))
    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }))
  }

  it('emails a reset link and gives the same answer whether or not the account exists', async () => {
    existingAccount()
    const { user } = setup()
    await openForgot(user)
    await user.type(screen.getByLabelText('Email for the reset link'), NEW.email)
    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))
    expect(await screen.findByText(/if an account exists for amina@example.com, a reset link is on its way/i)).toBeInTheDocument()
    expect(fakeSupabase.state.emails).toEqual([{ type: 'reset', email: NEW.email, redirectTo: SITE_URL }])

    await user.clear(screen.getByLabelText('Email for the reset link'))
    await user.type(screen.getByLabelText('Email for the reset link'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))
    expect(await screen.findByText(/if an account exists for nobody@example.com, a reset link is on its way/i)).toBeInTheDocument()
  })

  it('needs a valid email and reports when too many emails were requested', async () => {
    const { user } = setup()
    await openForgot(user)
    await user.type(screen.getByLabelText('Email for the reset link'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    expect(fakeSupabase.state.emails).toEqual([])

    fakeSupabase.state.rateLimited = true
    await user.clear(screen.getByLabelText('Email for the reset link'))
    await user.type(screen.getByLabelText('Email for the reset link'), NEW.email)
    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))
    expect(await screen.findByText(/too many attempts or emails/i)).toBeInTheDocument()
  })

  it('shows the choose-a-new-password page after the emailed link is opened', async () => {
    existingAccount()
    const { user } = setup()
    fakeSupabase.openRecoveryLink(NEW.email)
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
    appIsHidden()

    await user.type(screen.getByLabelText('New password'), 'brand new pass')
    await user.type(screen.getByLabelText('Confirm new password'), 'different pass')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'brand new pass')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText('Your password was changed.')).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
    expect(fakeSupabase.state.users[0].password).toBe('brand new pass')
  })

  it('checks the new password before sending it', async () => {
    existingAccount()
    const { user } = setup()
    fakeSupabase.openRecoveryLink(NEW.email)
    await screen.findByRole('heading', { name: 'Choose a new password' })
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i)
    expect(fakeSupabase.state.users[0].password).toBe(NEW.password)

    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('New password'), 'weak-password')
    await user.type(screen.getByLabelText('Confirm new password'), 'weak-password')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/too easy to guess/i)
  })
})

describe('deleting the account', () => {
  async function signedIn(user) {
    const account = existingAccount()
    await signIn(user)
    await screen.findByText(/welcome back/i)
    return account
  }

  it('deletes the account and its plants only after a confirmation, then shows the sign-in page', async () => {
    const { user } = setup()
    const account = await signedIn(user)
    await user.type(screen.getByLabelText(/plant name/i), 'Doomed Fern')
    await user.type(screen.getByLabelText(/other care/i), 'Mist')
    await user.click(screen.getByRole('button', { name: /save plant/i }))
    await waitFor(() => expect(fakeSupabase.rowsFor(account.id)).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(screen.getByText(/permanently deletes the account and its 1 plant/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep my account' }))
    expect(screen.queryByText(/permanently deletes/i)).not.toBeInTheDocument()
    expect(fakeSupabase.state.users).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(await screen.findByText('Your account was deleted.')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(fakeSupabase.state.users).toHaveLength(0)
    expect(fakeSupabase.state.rows).toHaveLength(0)
  })

  it('says so and stays signed in when the account cannot be deleted', async () => {
    const { user } = setup()
    await signedIn(user)
    fakeSupabase.state.rpcError = { code: '42883', message: 'function public.delete_my_account() does not exist' }
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(await screen.findByText(/could not be deleted/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
    expect(fakeSupabase.state.users).toHaveLength(1)
  })
})
