const STORAGE_KEY = 'plant-care-notes-plants'

export function readPlants() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((plant) => plant && typeof plant.id === 'string'
      && typeof plant.name === 'string' && typeof plant.careNote === 'string')
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
