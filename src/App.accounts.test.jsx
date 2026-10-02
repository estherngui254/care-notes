import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { registerUser, signOutUser } from './accounts.js'
import { readPlants, writePlants } from './storage.js'

const setup = () => ({ user: userEvent.setup({ applyAccept: false }), ...render(<App />) })
const panel = () => within(screen.getByRole('tabpanel'))
const guestPlant = { id: 'p1', name: 'Old Pothos', careNote: 'Water weekly', recommendations: [] }

async function existingAccount(email = 'amina@example.com', name = 'Amina') {
  await registerUser({ name, email, password: 'correct horse', confirm: 'correct horse' })
  signOutUser()
}

async function register(user, { name = 'Amina', email = 'amina@example.com', password = 'correct horse', confirm = password } = {}) {
  await user.click(screen.getByRole('tab', { name: 'Create account' }))
  await user.type(panel().getByLabelText('Name'), name)
  await user.type(panel().getByLabelText('Email'), email)
  await user.type(panel().getByLabelText('Password'), password)
  await user.type(panel().getByLabelText('Confirm password'), confirm)
  await user.click(panel().getByRole('button', { name: 'Create account' }))
}

async function signIn(user, { email = 'amina@example.com', password = 'correct horse' } = {}) {
  await user.click(screen.getByRole('tab', { name: 'Sign in' }))
  await user.type(panel().getByLabelText('Email'), email)
  await user.type(panel().getByLabelText('Password'), password)
  await user.click(panel().getByRole('button', { name: 'Sign in' }))
}

async function addPlant(user, name) {
  await user.type(screen.getByLabelText(/plant name/i), name)
  await user.type(screen.getByLabelText(/other care/i), 'Water weekly')
  await user.click(screen.getByRole('button', { name: /save plant/i }))
}

const signOut = (user) => user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
const plantNames = () => screen.queryAllByRole('heading', { level: 3 })
  .filter((heading) => heading.closest('.record')).map((heading) => heading.textContent)

describe('nothing is shown until someone signs in', () => {
  it('shows only the sign-in page to a visitor who is not signed in', async () => {
    writePlants([guestPlant])
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Plant Care Notes' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText(/sign in or create an account to open your plants/i)).toBeInTheDocument()

    // No plants, no way to add or edit them, and none of the other sections.
    expect(screen.queryByText('Old Pothos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save plant/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/no plants saved yet/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /pest, disease and nutrient guide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /buy plants/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /identify a plant/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('does not let a stale or made-up session in', async () => {
    window.localStorage.setItem('plant-care-notes-session', 'someone-who-does-not-exist')
    setup()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
  })

  it('starts on Create account for a first visit and on Sign in once an account exists', async () => {
    const first = setup()
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Create your account' })).toBeInTheDocument()
    first.unmount()

    await existingAccount()
    setup()
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome back' })).toBeInTheDocument()
    expect(panel().getByLabelText('Email')).toHaveFocus()
  })

  it('says what accounts are and are not', async () => {
    setup()
    expect(screen.getByText(/stored in this browser only/i)).toBeInTheDocument()
    expect(screen.getByText(/do not sync between devices/i)).toBeInTheDocument()
  })

  it('offers no way to carry on without an account', () => {
    setup()
    expect(screen.queryByRole('button', { name: /guest/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/continue as guest|carry on as a guest/i)).not.toBeInTheDocument()
  })
})

describe('registering', () => {
  it('registers a new person, opens the app and welcomes them', async () => {
    const { user } = setup()
    await register(user)
    expect(await screen.findByText(/welcome, amina\. your account is ready/i)).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Account' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
    expect(document.querySelector('.hero-account')).toHaveTextContent('Signed in as Amina')
    expect(screen.getAllByText('Amina').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Sign out' }).length).toBeGreaterThan(0)
  })

  it('explains each problem with the form', async () => {
    const { user } = setup()
    await user.click(panel().getByRole('button', { name: 'Create account' }))
    expect(panel().getByText('Enter your name.')).toBeInTheDocument()
    expect(panel().getByText('Enter your email address.')).toBeInTheDocument()
    expect(panel().getByText('Choose a password.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()

    await user.type(panel().getByLabelText('Name'), 'Amina')
    await user.type(panel().getByLabelText('Email'), 'amina@')
    await user.type(panel().getByLabelText('Password'), 'short')
    await user.click(panel().getByRole('button', { name: 'Create account' }))
    expect(panel().getByText(/valid email address/i)).toBeInTheDocument()
    expect(panel().getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(panel().getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('catches a password typed differently the second time', async () => {
    const { user } = setup()
    await register(user, { confirm: 'something else' })
    expect(panel().getByText('The passwords do not match.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
  })

  it('does not allow the same email twice', async () => {
    await existingAccount()
    const { user } = setup()
    await register(user, { name: 'Someone else' })
    expect(panel().getByText(/already exists on this device/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
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
    await existingAccount()
    const { user } = setup()
    await signIn(user)
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()
  })

  it('signing out hides everything again, and signing back in restores it', async () => {
    const { user } = setup()
    await register(user)
    await addPlant(user, 'Amina Fern')
    expect(plantNames()).toEqual(['Amina Fern'])

    await signOut(user)
    expect(await screen.findByText('You are signed out.')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.queryByText('Amina Fern')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()

    await signIn(user)
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(plantNames()).toEqual(['Amina Fern'])
  })

  it('does not say whether the email or the password was wrong, and stays locked out', async () => {
    await existingAccount()
    const { user } = setup()
    await signIn(user, { password: 'wrong password' })
    expect(panel().getByRole('alert')).toHaveTextContent(/do not match an account on this device/i)
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
  })

  it('pauses sign-in after five wrong passwords, even for the right one', async () => {
    await existingAccount()
    const { user } = setup()
    await user.type(panel().getByLabelText('Email'), 'amina@example.com')
    for (let attempt = 0; attempt < 5; attempt++) {
      await user.clear(panel().getByLabelText('Password'))
      await user.type(panel().getByLabelText('Password'), 'wrong password')
      await user.click(panel().getByRole('button', { name: 'Sign in' }))
    }
    await user.clear(panel().getByLabelText('Password'))
    await user.type(panel().getByLabelText('Password'), 'correct horse')
    await user.click(panel().getByRole('button', { name: 'Sign in' }))
    expect(await panel().findByText(/too many wrong attempts/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
  })

  it('stays signed in after a reload, and not after signing out', async () => {
    const { user, unmount } = setup()
    await register(user)
    unmount()
    const again = render(<App />)
    expect(screen.getByLabelText(/plant name/i)).toBeInTheDocument()

    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    again.unmount()
    render(<App />)
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/plant name/i)).not.toBeInTheDocument()
  })

  it('does not keep the sign-in when "keep me signed in" is turned off', async () => {
    const { user, unmount } = setup()
    await user.type(panel().getByLabelText('Name'), 'Amina')
    await user.type(panel().getByLabelText('Email'), 'amina@example.com')
    await user.type(panel().getByLabelText('Password'), 'correct horse')
    await user.type(panel().getByLabelText('Confirm password'), 'correct horse')
    await user.click(panel().getByLabelText('Keep me signed in on this device'))
    await user.click(panel().getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/your account is ready/i)).toBeInTheDocument()
    expect(window.localStorage.getItem('plant-care-notes-session')).toBeNull()
    unmount()
    window.sessionStorage.clear()
    render(<App />)
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
  })

  it('has a theme button on the sign-in page too', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /dark mode/i }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('plant-care-notes-theme')).toBe('dark')
  })
})

describe('each account has its own plants', () => {
  it('keeps plants separate between accounts', async () => {
    const { user } = setup()
    await register(user, { name: 'Amina', email: 'a@example.com' })
    await addPlant(user, 'Amina Fern')
    await signOut(user)

    await register(user, { name: 'Brian', email: 'b@example.com' })
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
    await addPlant(user, 'Brian Aloe')
    expect(plantNames()).toEqual(['Brian Aloe'])
    await signOut(user)

    await signIn(user, { email: 'a@example.com' })
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(plantNames()).toEqual(['Amina Fern'])
  })

  it('adds the plants already on the device to a new account when asked', async () => {
    writePlants([guestPlant])
    const { user } = setup()
    expect(panel().getByLabelText(/add the 1 plant already saved on this device/i)).toBeChecked()
    await register(user)
    expect(await screen.findByText(/1 plant was added to your account/i)).toBeInTheDocument()
    expect(plantNames()).toEqual(['Old Pothos'])
    expect(readPlants()).toHaveLength(0)
  })

  it('leaves them out of the account when the box is unticked', async () => {
    writePlants([guestPlant])
    const { user } = setup()
    await user.click(panel().getByLabelText(/add the 1 plant/i))
    await register(user)
    expect(await screen.findByText(/your account is ready/i)).toBeInTheDocument()
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
    expect(readPlants()).toHaveLength(1)
  })
})

describe('forgotten passwords and deleting an account', () => {
  it('removes an account for someone who forgot the password, after a warning', async () => {
    const { user } = setup()
    await register(user)
    await addPlant(user, 'Lost Fern')
    await signOut(user)

    await user.click(screen.getByRole('tab', { name: 'Sign in' }))
    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }))
    expect(screen.getByText(/no email to reset a password/i)).toBeInTheDocument()
    const remove = screen.getByRole('button', { name: 'Remove account' })
    expect(remove).toBeDisabled()
    await user.type(screen.getByLabelText('Email of the account to remove'), 'amina@example.com')
    expect(remove).toBeDisabled()
    await user.click(screen.getByLabelText(/i understand the plants/i))
    await user.click(remove)

    expect(screen.getByText(/account for amina@example.com was removed/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Create your account' })).toBeInTheDocument()
    expect(panel().getByLabelText('Email')).toHaveValue('amina@example.com')
  })

  it('says when there is no such account to remove', async () => {
    await existingAccount()
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }))
    await user.type(screen.getByLabelText('Email of the account to remove'), 'nobody@example.com')
    await user.click(screen.getByLabelText(/i understand the plants/i))
    await user.click(screen.getByRole('button', { name: 'Remove account' }))
    expect(screen.getByText(/no account with that email was found/i)).toBeInTheDocument()
  })

  it('deletes the signed-in account only after a confirmation, then shows the sign-in page', async () => {
    const { user } = setup()
    await register(user)
    await addPlant(user, 'Doomed Fern')
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(screen.getByText(/removes the account and its 1 plant/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep my account' }))
    expect(screen.queryByText(/removes the account/i)).not.toBeInTheDocument()
    expect(plantNames()).toEqual(['Doomed Fern'])

    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(await screen.findByText(/your account was deleted/i)).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument()
    expect(screen.queryByText('Doomed Fern')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('plant-care-notes-users')).toBe('[]')
  })
})
