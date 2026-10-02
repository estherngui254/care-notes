import { supabase } from './supabaseClient.js'
import { normalizePlants } from './storage.js'

// Plants are stored one row each in the `plants` table (see supabase/schema.sql). Row Level Security
// makes the server hand back, and accept, only the signed-in person's own rows.
const TABLE = 'plants'
const BATCH = 20

// Sorts a failure into something the screen can explain.
export function describeDbError(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (code === 'PGRST205' || code === '42P01' || /could not find the table|does not exist/i.test(message)) {
    return { kind: 'setup', text: 'The database is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor.' }
  }
  if (error?.status === 401 || error?.status === 403 || code === '42501' || code === 'PGRST301' || /jwt/i.test(message)) {
    return { kind: 'auth', text: 'Your sign-in has expired or is not allowed to save. Sign out and sign in again.' }
  }
  if (error?.name === 'TypeError' || error?.status === 0 || /failed to fetch|network|load failed/i.test(message)) {
    return { kind: 'network', text: 'You are offline. Changes are kept on this device and will be saved when you are back online.' }
  }
  return { kind: 'other', text: 'Could not save to your account. Changes are kept on this device and will be tried again.' }
}

export async function fetchCloudPlants(userId) {
  try {
    const { data, error } = await supabase.from(TABLE).select('id, data').eq('user_id', userId)
    if (error) return { error: describeDbError(error) }
    return { plants: normalizePlants((data ?? []).map((row) => row.data)) }
  } catch (error) {
    return { error: describeDbError(error) }
  }
}

export async function pushChanges({ userId, upserts, deletes }) {
  try {
    const stamp = new Date().toISOString()
    for (let start = 0; start < upserts.length; start += BATCH) {
      const rows = upserts.slice(start, start + BATCH).map((plant) => ({ user_id: userId, id: plant.id, data: plant, updated_at: stamp }))
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'user_id,id' })
      if (error) return { error: describeDbError(error) }
    }
    if (deletes.length > 0) {
      const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).in('id', deletes)
      if (error) return { error: describeDbError(error) }
    }
    return { ok: true }
  } catch (error) {
    return { error: describeDbError(error) }
  }
}

// What the server is known to hold, as id -> JSON text, so a change can be spotted cheaply.
export const snapshot = (plants) => new Map(plants.map((plant) => [plant.id, JSON.stringify(plant)]))

export function changedPlants(synced, plants) {
  return plants.filter((plant) => synced.get(plant.id) !== JSON.stringify(plant))
}

// Where unsynced work is remembered between visits: which plants were deleted while offline,
// and whether any change is still waiting to be saved.
const pendingKey = (userId) => `plant-care-notes-pending:${userId}`

export function readPending(userId) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(pendingKey(userId)) ?? 'null')
    return {
      dirty: parsed?.dirty === true,
      deleted: new Set(Array.isArray(parsed?.deleted) ? parsed.deleted.filter((id) => typeof id === 'string') : []),
    }
  } catch {
    return { dirty: false, deleted: new Set() }
  }
}

export function writePending(userId, { dirty, deleted }) {
  try {
    if (!dirty && deleted.size === 0) window.localStorage.removeItem(pendingKey(userId))
    else window.localStorage.setItem(pendingKey(userId), JSON.stringify({ dirty, deleted: [...deleted] }))
  } catch {
    // The changes are still saved to the account when there is a connection.
  }
}

export function clearPending(userId) {
  try {
    window.localStorage.removeItem(pendingKey(userId))
  } catch {
    // Nothing to clear.
  }
}
