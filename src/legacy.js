import { normalizePlants } from './storage.js'

// Before plants were kept in an account, they lived in this browser: first as one shared list, then
// per local account. Those copies are still on the device, and can be added to the signed-in account.
const GUEST_KEY = 'plant-care-notes-plants'
const SCOPED_PREFIX = `${GUEST_KEY}:`
const CLOUD_COPY_PREFIX = `${SCOPED_PREFIX}cloud-` // the device copy of an account is not "old"
const OLD_ACCOUNT_KEYS = ['plant-care-notes-users', 'plant-care-notes-session']

function oldKeys() {
  const keys = []
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index)
      if (key === GUEST_KEY || (key?.startsWith(SCOPED_PREFIX) && !key.startsWith(CLOUD_COPY_PREFIX))) keys.push(key)
    }
  } catch {
    // Storage is not available.
  }
  return keys
}

export function readLegacyPlants() {
  const byId = new Map()
  for (const key of oldKeys()) {
    try {
      for (const plant of normalizePlants(JSON.parse(window.localStorage.getItem(key) ?? '[]'))) {
        if (!byId.has(plant.id)) byId.set(plant.id, plant)
      }
    } catch {
      // Skip a copy that cannot be read.
    }
  }
  return [...byId.values()]
}

export function clearLegacyPlants() {
  try {
    for (const key of oldKeys()) window.localStorage.removeItem(key)
  } catch {
    // Nothing more can be done.
  }
}

// The old on-device accounts (names, emails and password hashes) are no longer used.
export function removeOldAccounts() {
  try {
    for (const key of OLD_ACCOUNT_KEYS) window.localStorage.removeItem(key)
    window.sessionStorage.removeItem('plant-care-notes-session')
  } catch {
    // Nothing to remove.
  }
}
