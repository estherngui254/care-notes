const STORAGE_KEY = 'plant-care-notes-plants'
const THEME_KEY = 'plant-care-notes-theme'

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
    }))
}

export function readPlants() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    return normalizePlants(JSON.parse(saved))
  } catch {
    return []
  }
}

export function writePlants(plants) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plants))
    return true
  } catch {
    return false
  }
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
