import { describe, expect, it } from 'vitest'
import {
  deleteMyAccount, readCachedPerson, resendConfirmation, sendPasswordReset, setNewPassword, signInPerson, signUpPerson, toPerson,
} from './auth.js'
import { changedPlants, describeDbError, readPending, snapshot, writePending } from './cloudPlants.js'
import { validateEmail, validatePassword, validateRegistration } from './validation.js'
import { readLegacyPlants } from './legacy.js'
import { fakeSupabase } from './test/fakeSupabase.js'

const good = { name: 'Amina', email: 'Amina@Example.com', password: 'correct horse', confirm: 'correct horse' }

describe('people', () => {
  it('builds the small person object from a Supabase user', () => {
    expect(toPerson({ id: 'u1', email: 'a@b.co', user_metadata: { name: ' Amina ' } })).toEqual({ id: 'u1', email: 'a@b.co', name: 'Amina' })
    expect(toPerson({ id: 'u1', email: 'amina@b.co', user_metadata: {} }).name).toBe('amina')
    expect(toPerson({ id: 'u1', email: '', user_metadata: {} }).name).toBe('Friend')
    expect(toPerson(null)).toBeNull()
  })

  it('reads the signed-in person from the saved session without any network call', () => {
    window.localStorage.clear()
    expect(readCachedPerson()).toBeNull()
    window.localStorage.setItem('sb-abc123-auth-token', JSON.stringify({ access_token: 't', user: { id: 'u9', email: 'x@y.co', user_metadata: { name: 'Xena' } } }))
    expect(readCachedPerson()).toEqual({ id: 'u9', email: 'x@y.co', name: 'Xena' })
    expect(fakeSupabase.state.calls).toEqual([])
    window.localStorage.setItem('sb-abc123-auth-token', 'not json')
    expect(readCachedPerson()).toBeNull()
  })
})

describe('validation', () => {
  it('checks emails, passwords and the registration form', () => {
    expect(validateEmail('a@b.co')).toBe('')
    expect(validateEmail('a@b')).toMatch(/valid email/i)
    expect(validateEmail('  ')).toMatch(/enter your email/i)
    expect(validatePassword('12345678')).toBe('')
    expect(validatePassword('1234567')).toMatch(/at least 8/i)
    expect(validatePassword('x'.repeat(129))).toMatch(/no more than 128/i)
    expect(validateRegistration({ name: '', email: '', password: '', confirm: '' })).toEqual({
      name: 'Enter your name.', email: 'Enter your email address.', password: 'Choose a password.',
    })
    expect(validateRegistration({ ...good, confirm: 'nope nope' }).confirm).toBe('The passwords do not match.')
    expect(validateRegistration(good)).toEqual({})
  })
})

describe('signUpPerson', () => {
  it('normalises the email, keeps the name and asks for confirmation', async () => {
    const result = await signUpPerson(good)
    expect(result).toEqual({ needsConfirmation: true, email: 'amina@example.com' })
    expect(fakeSupabase.state.users.at(-1).metadata).toEqual({ name: 'Amina' })
    expect(fakeSupabase.state.session).toBeTruthy() // the test account is signed in; sign-up must not change it
  })

  it('returns the person when the project does not need confirmation', async () => {
    fakeSupabase.state.confirmRequired = false
    const result = await signUpPerson(good)
    expect(result.person).toEqual({ id: expect.any(String), email: 'amina@example.com', name: 'Amina' })
  })

  it('does not call the server when the form is invalid', async () => {
    const result = await signUpPerson({ ...good, password: 'short', confirm: 'short' })
    expect(result.errors.password).toBeTruthy()
    expect(fakeSupabase.state.calls).toEqual([])
  })

  it('reports a network failure as a form error and never throws', async () => {
    fakeSupabase.state.offline = true
    expect((await signUpPerson(good)).errors.form).toMatch(/could not reach the server/i)
  })
})

describe('signInPerson', () => {
  it('maps the service\'s answers to plain messages', async () => {
    const account = fakeSupabase.addUser({ name: 'Amina', email: 'amina@example.com', password: 'correct horse' })
    expect((await signInPerson({ email: 'AMINA@example.com', password: 'correct horse' })).person.id).toBe(account.id)
    expect((await signInPerson({ email: 'amina@example.com', password: 'nope nope' })).error).toMatch(/do not match an account/i)
    fakeSupabase.addUser({ name: 'New', email: 'new@example.com', password: 'correct horse', confirmed: false })
    const unconfirmed = await signInPerson({ email: 'new@example.com', password: 'correct horse' })
    expect(unconfirmed).toMatchObject({ unconfirmed: true })
    expect(unconfirmed.error).toMatch(/confirm your email first/i)
    fakeSupabase.state.offline = true
    expect((await signInPerson({ email: 'amina@example.com', password: 'correct horse' })).error).toMatch(/could not reach the server/i)
  })
})

describe('other account actions', () => {
  it('resends the confirmation email and reports rate limits', async () => {
    expect(await resendConfirmation('A@b.co')).toEqual({ ok: true })
    fakeSupabase.state.rateLimited = true
    expect((await resendConfirmation('a@b.co')).error).toMatch(/too many/i)
  })

  it('sends a reset link with the same answer for any address', async () => {
    expect(await sendPasswordReset('nobody@example.com')).toEqual({ ok: true })
    expect(fakeSupabase.state.emails.at(-1)).toMatchObject({ type: 'reset', email: 'nobody@example.com' })
    expect((await sendPasswordReset('nope')).error).toMatch(/valid email/i)
  })

  it('changes the password only for a valid new one', async () => {
    expect((await setNewPassword('short')).error).toMatch(/at least 8/i)
    expect((await setNewPassword('weak-password')).error).toMatch(/too easy to guess/i)
    expect((await setNewPassword('a better password')).person).toBeTruthy()
    expect(fakeSupabase.state.users[0].password).toBe('a better password')
  })

  it('deletes the account through the database function', async () => {
    expect(await deleteMyAccount()).toEqual({ ok: true })
    expect(fakeSupabase.state.calls.at(-1)).toEqual(['rpc', 'delete_my_account'])
    expect(fakeSupabase.state.users).toHaveLength(0)
  })

  it('reports a delete that fails without throwing', async () => {
    fakeSupabase.state.rpcError = { code: '42883', message: 'function does not exist' }
    expect((await deleteMyAccount()).error).toMatch(/could not be deleted/i)
    expect(fakeSupabase.state.users).toHaveLength(1)
  })
})

describe('cloud helpers', () => {
  it('sorts failures into kinds the screen can explain', () => {
    expect(describeDbError({ code: 'PGRST205', message: 'Could not find the table' }).kind).toBe('setup')
    expect(describeDbError({ code: '42P01', message: 'relation does not exist' }).kind).toBe('setup')
    expect(describeDbError({ code: '42501', message: 'permission denied' }).kind).toBe('auth')
    expect(describeDbError({ status: 401, message: 'x' }).kind).toBe('auth')
    expect(describeDbError({ message: 'JWT expired' }).kind).toBe('auth')
    expect(describeDbError({ message: 'TypeError: Failed to fetch' }).kind).toBe('network')
    expect(describeDbError(new TypeError('boom')).kind).toBe('network')
    expect(describeDbError({ code: 'XX000', message: 'odd' }).kind).toBe('other')
  })

  it('spots which plants have changed since they were last saved', () => {
    const a = { id: 'a', name: 'A' }
    const b = { id: 'b', name: 'B' }
    const synced = snapshot([a, b])
    expect(changedPlants(synced, [a, b])).toEqual([])
    expect(changedPlants(synced, [a, { ...b, name: 'B2' }])).toEqual([{ id: 'b', name: 'B2' }])
    expect(changedPlants(synced, [a, b, { id: 'c', name: 'C' }]).map((item) => item.id)).toEqual(['c'])
    expect(changedPlants(snapshot([]), [a])).toEqual([a])
  })

  it('remembers unsaved work between visits, and forgets it when there is none', () => {
    expect(readPending('u1')).toEqual({ dirty: false, deleted: new Set() })
    writePending('u1', { dirty: true, deleted: new Set(['p1', 'p2']) })
    expect(readPending('u1')).toEqual({ dirty: true, deleted: new Set(['p1', 'p2']) })
    writePending('u1', { dirty: false, deleted: new Set() })
    expect(window.localStorage.getItem('plant-care-notes-pending:u1')).toBeNull()
    window.localStorage.setItem('plant-care-notes-pending:u1', '{bad json')
    expect(readPending('u1').dirty).toBe(false)
  })

  it('finds old on-device plants but not an account\'s own device copy', () => {
    const item = (id) => ({ id, name: id, careNote: 'x', recommendations: [] })
    window.localStorage.setItem('plant-care-notes-plants', JSON.stringify([item('g1'), item('shared')]))
    window.localStorage.setItem('plant-care-notes-plants:acct-1', JSON.stringify([item('a1'), item('shared')]))
    window.localStorage.setItem('plant-care-notes-plants:cloud-u1', JSON.stringify([item('c1')]))
    window.localStorage.setItem('plant-care-notes-plants:acct-2', 'not json')
    expect(readLegacyPlants().map((plant) => plant.id).sort()).toEqual(['a1', 'g1', 'shared'])
  })
})
