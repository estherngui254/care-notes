import { supabase } from './supabaseClient.js'
import { SITE_URL } from './site.js'
import { normalizeEmail, validateEmail, validatePassword, validateRegistration } from './validation.js'

// Sign-in, registration and password reset, handled by Supabase. Passwords are never stored or
// hashed by this app. Every function returns a plain result object and never throws.

const CODES = {
  unconfirmed: ['email_not_confirmed'],
  badLogin: ['invalid_credentials'],
  rateLimited: ['over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'],
  weakPassword: ['weak_password'],
}

const has = (list, code) => list.includes(code)

// Turns a person from Supabase into the small object the app uses.
export function toPerson(user) {
  if (!user) return null
  const email = user.email ?? ''
  const name = (user.user_metadata?.name ?? '').trim() || email.split('@')[0] || 'Friend'
  return { id: user.id, email, name }
}

function describe(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (has(CODES.unconfirmed, code) || /email not confirmed/i.test(message)) return { kind: 'unconfirmed' }
  if (has(CODES.badLogin, code) || /invalid login credentials/i.test(message)) return { kind: 'badLogin' }
  if (has(CODES.rateLimited, code) || error?.status === 429) {
    return { kind: 'rateLimited', text: 'Too many attempts or emails just now. Wait a few minutes and try again.' }
  }
  if (has(CODES.weakPassword, code)) {
    return { kind: 'weakPassword', text: 'That password is too easy to guess. Choose a longer or less common one.' }
  }
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(message)) {
    return { kind: 'network', text: 'Could not reach the server. Check your internet connection and try again.' }
  }
  return { kind: 'other', text: 'Something went wrong. Please try again.' }
}

// Reads who is signed in straight from the session Supabase keeps in this browser, without waiting
// for the network, so a returning person never sees the sign-in page flash up. It is only used to
// choose what to show first: the real check follows, and the server still decides what they can reach.
export function readCachedPerson() {
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index)
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue
      const user = JSON.parse(window.localStorage.getItem(key) ?? 'null')?.user
      if (user?.id) return toPerson(user)
    }
  } catch {
    // Storage is blocked or the value is not readable: wait for the real answer.
  }
  return null
}

export async function getCurrentPerson() {
  try {
    const { data } = await supabase.auth.getSession()
    return toPerson(data?.session?.user)
  } catch {
    return null
  }
}

// Calls `callback(event, person)` whenever someone signs in or out, or a reset link is opened.
// Returns a function that stops listening.
export function watchAuth(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, toPerson(session?.user)))
  return () => data.subscription.unsubscribe()
}

export async function signUpPerson({ name, email, password, confirm }) {
  const errors = validateRegistration({ name, email, password, confirm })
  if (Object.keys(errors).length > 0) return { errors }
  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: SITE_URL },
    })
    if (error) {
      const problem = describe(error)
      if (problem.kind === 'weakPassword') return { errors: { password: problem.text } }
      return { errors: { form: problem.text ?? 'Could not create the account. Please try again.' } }
    }
    // With email confirmation on, there is no session until the emailed link is opened.
    // When the address is already registered, Supabase answers the same way on purpose,
    // so nobody can use this form to find out who has an account.
    if (!data.session) return { needsConfirmation: true, email: normalizeEmail(email) }
    return { person: toPerson(data.user ?? data.session.user) }
  } catch {
    return { errors: { form: 'Could not reach the server. Check your internet connection and try again.' } }
  }
}

export async function signInPerson({ email, password }) {
  const emailProblem = validateEmail(email)
  if (emailProblem || !password) return { error: 'Enter your email and password.' }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
    if (error) {
      const problem = describe(error)
      if (problem.kind === 'unconfirmed') {
        return { error: 'Confirm your email first. Open the link we emailed you when you registered.', unconfirmed: true }
      }
      if (problem.kind === 'badLogin') return { error: 'That email and password do not match an account.' }
      return { error: problem.text }
    }
    return { person: toPerson(data.user ?? data.session?.user) }
  } catch {
    return { error: 'Could not reach the server. Check your internet connection and try again.' }
  }
}

export async function signOutPerson() {
  try {
    await supabase.auth.signOut()
  } catch {
    // The local session is cleared by the library even when the server cannot be reached.
  }
}

export async function resendConfirmation(email) {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: normalizeEmail(email), options: { emailRedirectTo: SITE_URL } })
    if (error) return { error: describe(error).text ?? 'Could not send the email. Please try again.' }
    return { ok: true }
  } catch {
    return { error: 'Could not reach the server. Check your internet connection and try again.' }
  }
}

// The answer is the same whether or not the address has an account, so it reveals nothing.
export async function sendPasswordReset(email) {
  const problem = validateEmail(email)
  if (problem) return { error: problem }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: SITE_URL })
    if (error && describe(error).kind !== 'other') return { error: describe(error).text }
    return { ok: true }
  } catch {
    return { error: 'Could not reach the server. Check your internet connection and try again.' }
  }
}

export async function setNewPassword(password) {
  const problem = validatePassword(password)
  if (problem) return { error: problem }
  try {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) return { error: describe(error).text ?? 'Could not change the password. Please try again.' }
    return { person: toPerson(data?.user) }
  } catch {
    return { error: 'Could not reach the server. Check your internet connection and try again.' }
  }
}

// Removes the account and, with it, every plant stored for it. Needs the SQL in supabase/schema.sql.
export async function deleteMyAccount() {
  try {
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return { error: 'The account could not be deleted. Please try again, or contact the person who runs this app.' }
    await signOutPerson()
    return { ok: true }
  } catch {
    return { error: 'Could not reach the server. Check your internet connection and try again.' }
  }
}
