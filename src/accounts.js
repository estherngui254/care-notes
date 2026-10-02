import { moveGuestPlantsTo, readPlants, removePlants } from './storage.js'

// Accounts live in this browser only. They keep each person's plants separate and ask for a
// password, but there is no server, so they do not sync and a password cannot be reset by email.
const USERS_KEY = 'plant-care-notes-users'
const SESSION_KEY = 'plant-care-notes-session'

export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 128
export const MAX_NAME = 40
export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_MS = 30_000

// Passwords are never stored. Only a salted PBKDF2 hash is. Tests use far fewer rounds to stay fast.
const ITERATIONS = import.meta.env.MODE === 'test' ? 1000 : 210_000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const normalizeEmail = (email) => email.trim().toLowerCase()

function toBase64(bytes) {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return btoa(text)
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0))
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: toBase64(salt), hash: toBase64(await derive(password, salt, ITERATIONS)), iterations: ITERATIONS }
}

export async function verifyPassword(password, record) {
  const expected = fromBase64(record.hash)
  const actual = await derive(password, fromBase64(record.salt), record.iterations)
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index]
  return difference === 0
}

/* ---------- Stored accounts ---------- */

export function readUsers() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((user) => user && ['id', 'name', 'email', 'salt', 'hash'].every((field) => typeof user[field] === 'string')
      && Number.isInteger(user.iterations))
  } catch {
    return []
  }
}

function writeUsers(users) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return true
  } catch {
    return false
  }
}

// What the rest of the app may know about a person. Never the hash.
export const publicUser = ({ id, name, email }) => ({ id, name, email })

/* ---------- Sessions ---------- */

// "Keep me signed in" uses localStorage. Otherwise the sign-in ends when the tab closes.
export function saveSession(userId, remember) {
  try {
    window.localStorage.removeItem(SESSION_KEY)
    window.sessionStorage.removeItem(SESSION_KEY)
    ;(remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, userId)
  } catch {
    // The person is still signed in for this visit.
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clear.
  }
}

export function readSession() {
  try {
    const id = window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY)
    const user = id ? readUsers().find((candidate) => candidate.id === id) : null
    return user ? publicUser(user) : null
  } catch {
    return null
  }
}

/* ---------- Registering ---------- */

export function validateRegistration({ name, email, password, confirm }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter your name.'
  else if (name.trim().length > MAX_NAME) errors.name = `Keep your name under ${MAX_NAME} characters.`
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address, like name@example.com.'
  if (!password) errors.password = 'Choose a password.'
  else if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`
  else if (password.length > MAX_PASSWORD) errors.password = `Use no more than ${MAX_PASSWORD} characters.`
  if (!errors.password && password !== confirm) errors.confirm = 'The passwords do not match.'
  return errors
}

export async function registerUser({ name, email, password, confirm, remember = true, adoptGuestPlants = false }) {
  const errors = validateRegistration({ name, email, password, confirm })
  if (Object.keys(errors).length > 0) return { errors }

  const users = readUsers()
  const address = normalizeEmail(email)
  if (users.some((user) => user.email === address)) {
    return { errors: { email: 'An account with this email already exists on this device. Try signing in.' } }
  }

  const user = { id: crypto.randomUUID(), name: name.trim(), email: address, ...(await hashPassword(password)), createdAt: new Date().toISOString() }
  if (!writeUsers([...users, user])) {
    return { errors: { form: 'This browser could not save the account. Check that site data is allowed, then try again.' } }
  }
  const moved = adoptGuestPlants ? moveGuestPlantsTo(user.id) : 0
  saveSession(user.id, remember)
  return { user: publicUser(user), moved }
}

/* ---------- Signing in ---------- */

// Repeated wrong passwords pause sign-in for a short while. This only slows down guessing in the
// page; it cannot stop someone who can read this browser's storage, which is why the screens
// say not to reuse passwords.
const failures = new Map()

export function resetLockouts() {
  failures.clear()
}

export async function signInUser({ email, password, remember = true, now = Date.now() }) {
  const address = normalizeEmail(email)
  if (!address || !password) return { error: 'Enter your email and password.' }

  const record = failures.get(address)
  if (record?.until > now) {
    const seconds = Math.ceil((record.until - now) / 1000)
    return { error: `Too many wrong attempts. Wait ${seconds} seconds and try again.`, locked: true }
  }

  const user = readUsers().find((candidate) => candidate.email === address)
  // The same work is done when the email is unknown, so the answer does not reveal which emails exist.
  const valid = user
    ? await verifyPassword(password, user)
    : (await derive(password, new Uint8Array(16), ITERATIONS), false)

  if (!valid) {
    const count = (record?.until > now ? 0 : record?.count ?? 0) + 1
    failures.set(address, count >= MAX_FAILED_ATTEMPTS ? { count: 0, until: now + LOCKOUT_MS } : { count, until: 0 })
    return { error: 'That email and password do not match an account on this device.' }
  }

  failures.delete(address)
  saveSession(user.id, remember)
  return { user: publicUser(user) }
}

export function signOutUser() {
  clearSession()
}

/* ---------- Removing an account ---------- */

// Removes the account and its plants from this device. This cannot be undone.
export function deleteUser(userId) {
  writeUsers(readUsers().filter((user) => user.id !== userId))
  removePlants(userId)
  clearSession()
}

// For someone who forgot their password: the account can be removed by its email address so they
// can register again. Their plants in it are lost, so the screen warns first.
export function deleteUserByEmail(email) {
  const user = readUsers().find((candidate) => candidate.email === normalizeEmail(email))
  if (!user) return false
  deleteUser(user.id)
  return true
}

export function guestPlantCount() {
  return readPlants().length
}
