const STORAGE_KEY = 'plant-care-notes-plants'

export function readPlants() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((plant) => plant && typeof plant.id === 'string'
      && typeof plant.name === 'string' && typeof plant.careNote === 'string')
      .map(({ plantTypes, ...plant }) => ({
        ...plant,
        // Plants saved with the earlier multi-select keep their first type.
        plantType: typeof plant.plantType === 'string' ? plant.plantType
          : (Array.isArray(plantTypes) && typeof plantTypes[0] === 'string' ? plantTypes[0] : ''),
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
