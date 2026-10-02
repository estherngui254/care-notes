import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { readPlants, writePlants } from './storage.js'

const setup = () => ({ user: userEvent.setup({ applyAccept: false }), ...render(<App />) })
const dialog = () => screen.getByRole('dialog')

async function openRegister(user) {
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  return within(dialog())
}

async function register(user, { name = 'Amina', email = 'amina@example.com', password = 'correct horse', confirm = password } = {}) {
  const box = await openRegister(user)
  await user.type(box.getByLabelText('Name'), name)
  await user.type(box.getByLabelText('Email'), email)
  await user.type(box.getByLabelText('Password'), password)
  await user.type(box.getByLabelText('Confirm password'), confirm)
  await user.click(box.getByRole('button', { name: 'Create account' }))
}

async function signIn(user, { email = 'amina@example.com', password = 'correct horse' } = {}) {
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  const box = within(dialog())
  await user.type(box.getByLabelText('Email'), email)
  await user.type(box.getByLabelText('Password'), password)
  await user.click(box.getByRole('button', { name: 'Sign in' }))
}

async function addPlant(user, name) {
  await user.type(screen.getByLabelText(/plant name/i), name)
  await user.type(screen.getByLabelText(/other care/i), 'Water weekly')
  await user.click(screen.getByRole('button', { name: /save plant/i }))
}

const plantNames = () => screen.queryAllByRole('heading', { level: 3 })
  .filter((heading) => heading.closest('.record')).map((heading) => heading.textContent)

describe('where a new person can register and sign in', () => {
  it('offers sign in and create account to a guest, and the app still works as a guest', async () => {
    const { user } = setup()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create a free account' })).toBeInTheDocument()
    await addPlant(user, 'Guest Fern')
    expect(plantNames()).toEqual(['Guest Fern'])
    expect(readPlants()).toHaveLength(1)
  })

  it('opens a dialog with sign-in and register tabs, and closes with Escape', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(dialog()).toHaveAccessibleName('Welcome back')
    const tabs = within(dialog()).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Sign in', 'Create account'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog()).getByLabelText('Email')).toHaveFocus()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Plant Care Notes' })).toBeInTheDocument()
  })

  it('switches between the tabs and says what accounts are', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await user.click(within(dialog()).getByRole('tab', { name: 'Create account' }))
    expect(dialog()).toHaveAccessibleName('Create your account')
    expect(within(dialog()).getByLabelText('Name')).toHaveFocus()
    expect(within(dialog()).getByText(/stored in this browser only/i)).toBeInTheDocument()
    expect(within(dialog()).getByText(/do not sync between devices/i)).toBeInTheDocument()
  })

  it('registers a new person, signs them in and welcomes them', async () => {
    const { user } = setup()
    await register(user)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText(/welcome, amina\. your account is ready/i)).toBeInTheDocument()
    expect(screen.getAllByText('Amina').length).toBeGreaterThan(0)
    expect(document.querySelector('.hero-account')).toHaveTextContent('Signed in as Amina')
    expect(screen.getAllByRole('button', { name: 'Sign out' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument()
  })

  it('explains each problem with the registration form', async () => {
    const { user } = setup()
    const box = await openRegister(user)
    await user.click(box.getByRole('button', { name: 'Create account' }))
    expect(box.getByText('Enter your name.')).toBeInTheDocument()
    expect(box.getByText('Enter your email address.')).toBeInTheDocument()
    expect(box.getByText('Choose a password.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.type(box.getByLabelText('Name'), 'Amina')
    await user.type(box.getByLabelText('Email'), 'amina@')
    await user.type(box.getByLabelText('Password'), 'short')
    await user.click(box.getByRole('button', { name: 'Create account' }))
    expect(box.getByText(/valid email address/i)).toBeInTheDocument()
    expect(box.getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(box.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('catches a password that was typed differently the second time', async () => {
    const { user } = setup()
    await register(user, { confirm: 'something else' })
    expect(within(dialog()).getByText('The passwords do not match.')).toBeInTheDocument()
  })

  it('does not allow the same email twice', async () => {
    const { user } = setup()
    await register(user)
    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    await register(user, { name: 'Someone else' })
    expect(within(dialog()).getByText(/already exists on this device/i)).toBeInTheDocument()
  })

  it('shows and hides the password', async () => {
    const { user } = setup()
    const box = await openRegister(user)
    await user.type(box.getByLabelText('Password'), 'visible pass')
    expect(box.getByLabelText('Password')).toHaveAttribute('type', 'password')
    await user.click(box.getByRole('button', { name: 'Show password' }))
    expect(box.getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.click(box.getByRole('button', { name: 'Hide password' }))
    expect(box.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})

describe('signing in and out', () => {
  async function createAndSignOut(user) {
    await register(user)
    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
  }

  it('signs a person out, then back in', async () => {
    const { user } = setup()
    await createAndSignOut(user)
    expect(await screen.findByText('You are signed out.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()

    await signIn(user)
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(document.querySelector('.hero-account')).toHaveTextContent('Signed in as Amina')
  })

  it('does not say whether the email or the password was wrong', async () => {
    const { user } = setup()
    await createAndSignOut(user)
    await signIn(user, { password: 'wrong password' })
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(/do not match an account on this device/i)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('pauses sign-in after five wrong passwords', async () => {
    const { user } = setup()
    await createAndSignOut(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const box = within(dialog())
    await user.type(box.getByLabelText('Email'), 'amina@example.com')
    for (let attempt = 0; attempt < 5; attempt++) {
      await user.clear(box.getByLabelText('Password'))
      await user.type(box.getByLabelText('Password'), 'wrong password')
      await user.click(box.getByRole('button', { name: 'Sign in' }))
    }
    await user.clear(box.getByLabelText('Password'))
    await user.type(box.getByLabelText('Password'), 'correct horse')
    await user.click(box.getByRole('button', { name: 'Sign in' }))
    expect(await box.findByText(/too many wrong attempts/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('stays signed in after a reload, and not after signing out', async () => {
    const { user, unmount } = setup()
    await register(user)
    unmount()
    const again = render(<App />)
    expect(document.querySelector('.hero-account')).toHaveTextContent('Signed in as Amina')

    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    again.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('does not keep the sign-in when "keep me signed in" is turned off', async () => {
    const { user, unmount } = setup()
    const box = await openRegister(user)
    await user.type(box.getByLabelText('Name'), 'Amina')
    await user.type(box.getByLabelText('Email'), 'amina@example.com')
    await user.type(box.getByLabelText('Password'), 'correct horse')
    await user.type(box.getByLabelText('Confirm password'), 'correct horse')
    await user.click(box.getByLabelText('Keep me signed in on this device'))
    await user.click(box.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/your account is ready/i)).toBeInTheDocument()
    expect(window.localStorage.getItem('plant-care-notes-session')).toBeNull()
    unmount()
    window.sessionStorage.clear()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('each account has its own plants', () => {
  it('keeps plants separate between guest, one account and another', async () => {
    const { user } = setup()
    await register(user, { name: 'Amina', email: 'a@example.com' })
    await addPlant(user, 'Amina Fern')
    expect(plantNames()).toEqual(['Amina Fern'])

    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()

    await register(user, { name: 'Brian', email: 'b@example.com' })
    expect(screen.getByText(/no plants saved yet/i)).toBeInTheDocument()
    await addPlant(user, 'Brian Aloe')
    expect(plantNames()).toEqual(['Brian Aloe'])

    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])
    await signIn(user, { email: 'a@example.com' })
    expect(await screen.findByText(/welcome back, amina/i)).toBeInTheDocument()
    expect(plantNames()).toEqual(['Amina Fern'])
  })

  it('adds the plants already on the device to a new account when asked', async () => {
    writePlants([{ id: 'p1', name: 'Old Pothos', careNote: 'Water weekly', recommendations: [] }])
    const { user } = setup()
    const box = await openRegister(user)
    expect(box.getByLabelText(/add the 1 plant already saved on this device/i)).toBeChecked()
    await user.type(box.getByLabelText('Name'), 'Amina')
    await user.type(box.getByLabelText('Email'), 'amina@example.com')
    await user.type(box.getByLabelText('Password'), 'correct horse')
    await user.type(box.getByLabelText('Confirm password'), 'correct horse')
    await user.click(box.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/1 plant was added to your account/i)).toBeInTheDocument()
    expect(plantNames()).toEqual(['Old Pothos'])
    expect(readPlants()).toHaveLength(0)
  })

  it('leaves the guest plants alone when the box is unticked', async () => {
    writePlants([{ id: 'p1', name: 'Old Pothos', careNote: 'Water weekly', recommendations: [] }])
    const { user } = setup()
    const box = await openRegister(user)
    await user.type(box.getByLabelText('Name'), 'Amina')
    await user.type(box.getByLabelText('Email'), 'amina@example.com')
    await user.type(box.getByLabelText('Password'), 'correct horse')
    await user.type(box.getByLabelText('Confirm password'), 'correct horse')
    await user.click(box.getByLabelText(/add the 1 plant/i))
    await user.click(box.getByRole('button', { name: 'Create account' }))
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
    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const box = within(dialog())
    await user.click(box.getByRole('button', { name: 'Forgot your password?' }))
    expect(box.getByText(/no email to reset a password/i)).toBeInTheDocument()
    const remove = box.getByRole('button', { name: 'Remove account' })
    expect(remove).toBeDisabled()
    await user.type(box.getByLabelText('Email of the account to remove'), 'amina@example.com')
    expect(remove).toBeDisabled()
    await user.click(box.getByLabelText(/i understand the plants/i))
    await user.click(remove)

    expect(within(dialog()).getByText(/account for amina@example.com was removed/i)).toBeInTheDocument()
    expect(dialog()).toHaveAccessibleName('Create your account')
    expect(within(dialog()).getByLabelText('Email')).toHaveValue('amina@example.com')
  })

  it('says when there is no such account to remove', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const box = within(dialog())
    await user.click(box.getByRole('button', { name: 'Forgot your password?' }))
    await user.type(box.getByLabelText('Email of the account to remove'), 'nobody@example.com')
    await user.click(box.getByLabelText(/i understand the plants/i))
    await user.click(box.getByRole('button', { name: 'Remove account' }))
    expect(box.getByText(/no account with that email was found/i)).toBeInTheDocument()
  })

  it('deletes the signed-in account only after a confirmation', async () => {
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
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(window.localStorage.getItem('plant-care-notes-users')).toBe('[]')
  })
})
