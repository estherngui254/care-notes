import { PROBLEM_NAMES } from './identify.js'

const MAX_NOTE = 240

function cut(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

// Builds the values for a new saved plant from a scan result.
// `photo` and `issuePhoto` are small data URLs prepared by the caller. `date` is YYYY-MM-DD.
export function plantFromScan(result, { photo = '', issuePhoto = '', date }) {
  const { plant, care, health } = result
  const careNote = cut(
    [care.light && `Light: ${care.light}`, care.water && `Water: ${care.water}`].filter(Boolean).join(' ')
      || 'Identified from a photo.',
    MAX_NOTE,
  )
  const hasProfile = [plant.scientificName, care.light, care.water, care.humidity, care.temperature, care.soil, care.fertiliser, care.petSafety]
    .some(Boolean)

  const issues = health.findings.map((finding, index) => {
    const matched = PROBLEM_NAMES.includes(finding.matchedProblem) ? finding.matchedProblem : ''
    const detail = [!matched && finding.name, finding.signs].filter(Boolean).join(': ')
    return {
      id: crypto.randomUUID(),
      date,
      photo: index === 0 ? issuePhoto : '',
      symptoms: [],
      suspected: matched,
      notes: cut(`Found by photo scan (${finding.confidence} confidence). ${detail}`.trim(), MAX_NOTE),
      resolved: false,
      stepsDone: [],
    }
  })

  return {
    name: plant.commonName.slice(0, 80),
    careNote,
    lastWatered: '',
    waterEveryDays: care.waterEveryDays,
    recommendations: care.recommendations,
    photo,
    issues,
    careProfile: hasProfile
      ? {
          scientificName: plant.scientificName,
          light: care.light,
          water: care.water,
          humidity: care.humidity,
          temperature: care.temperature,
          soil: care.soil,
          fertiliser: care.fertiliser,
          petSafety: care.petSafety,
        }
      : null,
  }
}
