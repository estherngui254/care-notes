const STORAGE_KEY = 'plant-care-notes-plants'

function mergeType(name, type) {
  if (typeof type !== 'string' || !type || name.toLowerCase().includes(type.toLowerCase())) return name
  return `${name} (${type})`.slice(0, 80)
}

export function readPlants() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((plant) => plant && typeof plant.id === 'string'
      && typeof plant.name === 'string' && typeof plant.careNote === 'string')
      .map(({ plantTypes, plantType, ...plant }) => ({
        ...plant,
        // The plant type is now part of the name, so older records fold it in.
        name: mergeType(plant.name, typeof plantType === 'string' ? plantType : plantTypes?.[0]),
        recommendations: Array.isArray(plant.recommendations)
          ? plant.recommendations.filter((item) => typeof item === 'string') : [],
      }))
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
