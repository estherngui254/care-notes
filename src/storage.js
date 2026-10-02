const STORAGE_KEY = 'plant-care-notes-plants'
const THEME_KEY = 'plant-care-notes-theme'
const API_KEY_KEY = 'plant-care-notes-api-key'
const PROVIDER_KEY = 'plant-care-notes-provider'

const PROFILE_FIELDS = ['scientificName', 'light', 'water', 'humidity', 'temperature', 'soil', 'fertiliser', 'petSafety']

function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null
  const profile = {}
  for (const field of PROFILE_FIELDS) profile[field] = typeof raw[field] === 'string' ? raw[field].slice(0, 400) : ''
  return PROFILE_FIELDS.some((field) => profile[field]) ? profile : null
}

function mergeType(name, type) {
  if (typeof type !== 'string' || !type || name.toLowerCase().includes(type.toLowerCase())) return name
  return `${name} (${type})`.slice(0, 80)
}

function normalizeIssues(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((issue) => issue && typeof issue.id === 'string')
    .map((issue) => ({
      id: issue.id,
      date: typeof issue.date === 'string' ? issue.date : '',
      photo: typeof issue.photo === 'string' && issue.photo.startsWith('data:image/') ? issue.photo : '',
      symptoms: Array.isArray(issue.symptoms) ? issue.symptoms.filter((item) => typeof item === 'string') : [],
      suspected: typeof issue.suspected === 'string' ? issue.suspected : '',
      notes: typeof issue.notes === 'string' ? issue.notes : '',
      resolved: issue.resolved === true,
      stepsDone: Array.isArray(issue.stepsDone) ? issue.stepsDone.filter((item) => typeof item === 'string') : [],
    }))
}

// Keeps only well-formed plants and fills in fields added since earlier versions.
export function normalizePlants(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((plant) => plant && typeof plant.id === 'string'
      && typeof plant.name === 'string' && typeof plant.careNote === 'string')
    .map(({ plantTypes, plantType, ...plant }) => ({
      ...plant,
      // The plant type is now part of the name, so older records fold it in.
      name: mergeType(plant.name, typeof plantType === 'string' ? plantType : plantTypes?.[0]),
      recommendations: Array.isArray(plant.recommendations)
        ? plant.recommendations.filter((item) => typeof item === 'string') : [],
      lastWatered: typeof plant.lastWatered === 'string' ? plant.lastWatered : '',
      waterEveryDays: Number.isInteger(plant.waterEveryDays) && plant.waterEveryDays >= 1
        && plant.waterEveryDays <= 365 ? plant.waterEveryDays : null,
      photo: typeof plant.photo === 'string' && plant.photo.startsWith('data:image/') ? plant.photo : '',
      issues: normalizeIssues(plant.issues),
      careProfile: normalizeProfile(plant.careProfile),
    }))
}

// Plants are kept per account. Without a scope they belong to the guest, under the original
// key, so everything saved before accounts existed is still found.
const plantsKey = (scope) => (scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY)

export function readPlants(scope) {
  try {
    const saved = window.localStorage.getItem(plantsKey(scope))
    if (!saved) return []
    return normalizePlants(JSON.parse(saved))
  } catch {
    return []
  }
}

export function writePlants(plants, scope) {
  try {
    window.localStorage.setItem(plantsKey(scope), JSON.stringify(plants))
    return true
  } catch {
    return false
  }
}

export function removePlants(scope) {
  try {
    window.localStorage.removeItem(plantsKey(scope))
  } catch {
    // Nothing more can be done if storage is blocked.
  }
}

// Moves the guest's plants into an account. Returns how many plants were moved.
export function moveGuestPlantsTo(scope) {
  const plants = readPlants()
  if (plants.length === 0) return 0
  if (!writePlants([...plants, ...readPlants(scope)], scope)) return 0
  removePlants()
  return plants.length
}

export function readTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Fall through to the system preference.
  }
  const prefersDark = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function writeTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // The theme still applies for this visit.
  }
}

const keyName = (provider) => `${API_KEY_KEY}-${provider}`

// API keys stay in this browser, one per provider. They are never part of an export.
export function readApiKey(provider = 'gemini') {
  try {
    // Earlier versions stored a single Claude key under the plain name.
    return window.localStorage.getItem(keyName(provider))
      ?? (provider === 'claude' ? window.localStorage.getItem(API_KEY_KEY) : null)
      ?? ''
  } catch {
    return ''
  }
}

export function writeApiKey(provider, key) {
  try {
    if (key) {
      window.localStorage.setItem(keyName(provider), key)
    } else {
      window.localStorage.removeItem(keyName(provider))
      if (provider === 'claude') window.localStorage.removeItem(API_KEY_KEY)
    }
    return true
  } catch {
    return false
  }
}

export function readProvider() {
  try {
    const saved = window.localStorage.getItem(PROVIDER_KEY)
    if (saved === 'gemini' || saved === 'claude') return saved
    // Keep using Claude for anyone who had already saved a Claude key.
    if (window.localStorage.getItem(API_KEY_KEY) || window.localStorage.getItem(keyName('claude'))) return 'claude'
  } catch {
    // Fall through to the default.
  }
  return 'gemini'
}

export function writeProvider(provider) {
  try {
    window.localStorage.setItem(PROVIDER_KEY, provider)
  } catch {
    // The choice still applies for this visit.
  }
}

// Backup file format shared by export and import.
export function buildBackup(plants, now = new Date()) {
  return JSON.stringify({ app: 'plant-care-notes', version: 1, exportedAt: now.toISOString(), plants }, null, 2)
}

export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { error: 'That file is not valid JSON.' }
  }
  const list = Array.isArray(data) ? data : data?.plants
  if (!Array.isArray(list)) return { error: 'That file does not contain a list of plants.' }
  const plants = normalizePlants(list)
  if (plants.length === 0 && list.length > 0) return { error: 'No valid plants were found in that file.' }
  return { plants, skipped: list.length - plants.length }
}
