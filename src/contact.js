import { supabase } from './supabaseClient.js'

// Contacting the shop, leaving feedback, and reading the shop's updates.
//
// Messages and feedback go to the shop and to nobody else: Row Level Security in
// supabase/contact.sql lets a person read only their own rows, and the shop reads everything from
// the Supabase dashboard. The news table (the shop's updates) can be read by anyone signed in and
// is written only from the dashboard. Every function returns a plain result object and never throws.

const SETUP = 'Contact is not set up yet. The person running this app needs to run supabase/contact.sql in the Supabase SQL Editor.'
const NETWORK = 'You are offline or the server could not be reached. Check your connection and try again.'

// The kinds of feedback the shop accepts, and the limits the database checks too.
export const FEEDBACK_KINDS = [
  { value: 'review', label: 'A review' },
  { value: 'complaint', label: 'A complaint' },
  { value: 'compliment', label: 'A compliment' },
]
export const SUBJECT_MIN = 3
export const SUBJECT_MAX = 120
export const BODY_MIN = 10
export const BODY_MAX = 3000

export function describeContactError(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42883' || /could not find the (table|function)/i.test(message)) {
    return { kind: 'setup', text: SETUP }
  }
  if (code === '42501' || code === 'PGRST301' || error?.status === 401 || error?.status === 403 || /jwt|permission denied/i.test(message)) {
    return { kind: 'auth', text: 'Your sign-in has expired or is not allowed. Sign out and sign in again.' }
  }
  if (error?.name === 'TypeError' || error?.status === 0 || /failed to fetch|network|load failed/i.test(message)) {
    return { kind: 'network', text: NETWORK }
  }
  return { kind: 'other', text: 'That could not be sent just now. Please try again.' }
}

export function validateMessage({ subject, body }) {
  const errors = {}
  const title = (subject ?? '').trim()
  const text = (body ?? '').trim()
  if (title.length < SUBJECT_MIN) errors.subject = 'Enter a subject of at least 3 characters.'
  else if (title.length > SUBJECT_MAX) errors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`
  if (text.length < BODY_MIN) errors.body = `Write at least ${BODY_MIN} characters so the shop can help.`
  else if (text.length > BODY_MAX) errors.body = `Keep the message under ${BODY_MAX} characters.`
  return errors
}

export function validateFeedback({ kind, rating, body }) {
  const errors = {}
  if (!FEEDBACK_KINDS.some((option) => option.value === kind)) {
    errors.kind = 'Choose a review, complaint or compliment.'
  }
  if (kind === 'review') {
    const stars = Number(rating)
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) errors.rating = 'Choose a rating from 1 to 5.'
  }
  const text = (body ?? '').trim()
  if (text.length < BODY_MIN) errors.body = `Write at least ${BODY_MIN} characters.`
  else if (text.length > BODY_MAX) errors.body = `Keep it under ${BODY_MAX} characters.`
  return errors
}

// The shop's updates, newest first.
export async function fetchUpdates() {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, body, created_at')
      .order('created_at', { ascending: false })
    if (error) return { error: describeContactError(error) }
    return { updates: data ?? [] }
  } catch (error) {
    return { error: describeContactError(error) }
  }
}

export async function sendMessage({ subject, body }) {
  const errors = validateMessage({ subject, body })
  if (Object.keys(errors).length > 0) return { errors }
  try {
    // The user_id column is filled in by the database from the signed-in person.
    const { error } = await supabase.from('messages').insert({ subject: subject.trim(), body: body.trim() })
    if (error) return { error: describeContactError(error) }
    return { ok: true }
  } catch (error) {
    return { error: describeContactError(error) }
  }
}

export async function sendFeedback({ kind, rating, body }) {
  const errors = validateFeedback({ kind, rating, body })
  if (Object.keys(errors).length > 0) return { errors }
  try {
    const { error } = await supabase.from('feedback').insert({
      kind,
      rating: kind === 'review' ? Number(rating) : null,
      body: body.trim(),
    })
    if (error) return { error: describeContactError(error) }
    return { ok: true }
  } catch (error) {
    return { error: describeContactError(error) }
  }
}
