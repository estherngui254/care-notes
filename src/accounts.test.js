import { describe, expect, it } from 'vitest'
import {
  LOCKOUT_MS, MAX_FAILED_ATTEMPTS, deleteUser, deleteUserByEmail, hashPassword, readSession, readUsers, registerUser,
  signInUser, validateRegistration, verifyPassword,
} from './accounts.js'
import { readPlants, writePlants } from './storage.js'

const good = { name: 'Amina', email: 'Amina@Example.com', password: 'correct horse', confirm: 'correct horse' }
const plant = (name) => ({ id: name, name, careNote: 'Water weekly', recommendations: [] })

describe('passwords', () => {
  it('hashes with a random salt and verifies only the right password', async () => {
    const first = await hashPassword('secret-pass')
    const second = await hashPassword('secret-pass')
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
    expect(await verifyPassword('secret-pass', first)).toBe(true)
    expect(await verifyPassword('secret-pasT', first)).toBe(false)
    expect(await verifyPassword('', first)).toBe(false)
  })

  it('never stores the password itself', async () => {
    await registerUser(good)
    const raw = window.localStorage.getItem('plant-care-notes-users')
    expect(raw).not.toContain('correct horse')
    expect(readUsers()[0]).toEqual(expect.objectContaining({ salt: expect.any(String), hash: expect.any(String), iterations: expect.any(Number) }))
  })
})

describe('validateRegistration', () => {
  it('accepts good details', () => {
    expect(validateRegistration(good)).toEqual({})
  })

  it('reports each problem', () => {
    expect(validateRegistration({ name: '', email: '', password: '', confirm: '' })).toEqual({
      name: 'Enter your name.', email: 'Enter your email address.', password: 'Choose a password.',
    })
    expect(validateRegistration({ ...good, email: 'not-an-email' }).email).toMatch(/valid email/i)
    expect(validateRegistration({ ...good, password: 'short', confirm: 'short' }).password).toMatch(/at least 8/i)
    expect(validateRegistration({ ...good, confirm: 'different pass' }).confirm).toMatch(/do not match/i)
    expect(validateRegistration({ ...good, name: 'x'.repeat(41) }).name).toMatch(/under 40/i)
  })
})

describe('registerUser', () => {
  it('creates an account, normalises the email and signs the person in', async () => {
    const result = await registerUser(good)
    expect(result.user).toEqual({ id: expect.any(String), name: 'Amina', email: 'amina@example.com' })
    expect(result.user).not.toHaveProperty('hash')
    expect(readUsers()).toHaveLength(1)
    expect(readSession()).toEqual(result.user)
  })

  it('refuses a second account with the same email, whatever its case', async () => {
    await registerUser(good)
    const again = await registerUser({ ...good, name: 'Other', email: '  AMINA@example.COM ' })
    expect(again.errors.email).toMatch(/already exists/i)
    expect(readUsers()).toHaveLength(1)
  })

  it('does nothing when the details are invalid', async () => {
    const result = await registerUser({ ...good, confirm: 'nope nope' })
    expect(result.errors.confirm).toBeTruthy()
    expect(readUsers()).toHaveLength(0)
    expect(readSession()).toBeNull()
  })

  it('moves the guest plants into the new account only when asked', async () => {
    writePlants([plant('Pothos'), plant('Fern')])
    const kept = await registerUser({ ...good, adoptGuestPlants: false, email: 'a@example.com' })
    expect(kept.moved).toBe(0)
    expect(readPlants()).toHaveLength(2)
    expect(readPlants(kept.user.id)).toHaveLength(0)

    const moved = await registerUser({ ...good, adoptGuestPlants: true, email: 'b@example.com' })
    expect(moved.moved).toBe(2)
    expect(readPlants(moved.user.id).map((item) => item.name).sort()).toEqual(['Fern', 'Pothos'])
    expect(readPlants()).toHaveLength(0)
  })
})

describe('signInUser', () => {
  it('signs in with the right password, ignoring the email case', async () => {
    const { user } = await registerUser(good)
    window.localStorage.removeItem('plant-care-notes-session')
    const result = await signInUser({ email: ' AMINA@example.com', password: 'correct horse' })
    expect(result.user).toEqual(user)
    expect(readSession()).toEqual(user)
  })

  it('gives the same answer for a wrong password and an unknown email', async () => {
    await registerUser(good)
    const wrong = await signInUser({ email: 'amina@example.com', password: 'wrong password' })
    const unknown = await signInUser({ email: 'nobody@example.com', password: 'wrong password' })
    expect(wrong.error).toBeTruthy()
    expect(wrong.error).toBe(unknown.error)
    expect(wrong).not.toHaveProperty('user')
  })

  it('asks for both fields', async () => {
    expect((await signInUser({ email: '', password: 'x' })).error).toMatch(/enter your email and password/i)
    expect((await signInUser({ email: 'a@b.co', password: '' })).error).toMatch(/enter your email and password/i)
  })

  it('pauses sign-in after repeated wrong passwords, then allows it again', async () => {
    await registerUser(good)
    const start = 1_000_000
    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt++) {
      const result = await signInUser({ email: 'amina@example.com', password: 'wrong', now: start })
      expect(result.locked).toBeUndefined()
    }
    const blocked = await signInUser({ email: 'amina@example.com', password: 'correct horse', now: start + 1000 })
    expect(blocked.locked).toBe(true)
    expect(blocked.error).toMatch(/wait \d+ seconds/i)
    expect(blocked).not.toHaveProperty('user')

    const later = await signInUser({ email: 'amina@example.com', password: 'correct horse', now: start + LOCKOUT_MS + 1 })
    expect(later.user).toBeTruthy()
  })

  it('keeps the sign-in in the tab only when "keep me signed in" is off', async () => {
    const { user } = await registerUser({ ...good, remember: false })
    expect(window.localStorage.getItem('plant-care-notes-session')).toBeNull()
    expect(window.sessionStorage.getItem('plant-care-notes-session')).toBe(user.id)
    expect(readSession()).toEqual(user)

    await registerUser({ ...good, email: 'b@example.com', remember: true })
    expect(window.sessionStorage.getItem('plant-care-notes-session')).toBeNull()
    expect(window.localStorage.getItem('plant-care-notes-session')).toBeTruthy()
  })
})

describe('sessions and removal', () => {
  it('ignores a session for an account that no longer exists', () => {
    window.localStorage.setItem('plant-care-notes-session', 'ghost')
    expect(readSession()).toBeNull()
  })

  it('keeps each account\'s plants apart', async () => {
    const a = (await registerUser(good)).user
    const b = (await registerUser({ ...good, email: 'b@example.com' })).user
    writePlants([plant('Fern')], a.id)
    expect(readPlants(a.id)).toHaveLength(1)
    expect(readPlants(b.id)).toHaveLength(0)
    expect(readPlants()).toHaveLength(0)
  })

  it('deletes an account, its plants and its session', async () => {
    const { user } = await registerUser(good)
    writePlants([plant('Fern')], user.id)
    deleteUser(user.id)
    expect(readUsers()).toHaveLength(0)
    expect(readPlants(user.id)).toHaveLength(0)
    expect(readSession()).toBeNull()
  })

  it('removes an account by email for someone who forgot the password', async () => {
    const { user } = await registerUser(good)
    writePlants([plant('Fern')], user.id)
    expect(deleteUserByEmail('nobody@example.com')).toBe(false)
    expect(deleteUserByEmail(' AMINA@example.com ')).toBe(true)
    expect(readUsers()).toHaveLength(0)
    expect(readPlants(user.id)).toHaveLength(0)
    const again = await registerUser(good)
    expect(again.user).toBeTruthy()
  })

  it('survives storage that is full or unavailable', async () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('full') }
    try {
      const result = await registerUser(good)
      expect(result.errors.form).toMatch(/could not save the account/i)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
