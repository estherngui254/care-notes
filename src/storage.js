const STORAGE_KEY = 'workshop-mvp-records'

export function readRecords() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeRecords(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}
