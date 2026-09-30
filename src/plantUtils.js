const DAY_MS = 24 * 60 * 60 * 1000

export function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayString(now = new Date()) {
  return toDateString(now)
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(value) {
  return parseDate(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

// Whole calendar days from `from` to `to` (both YYYY-MM-DD). Rounds to absorb DST shifts.
export function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS)
}

export function nextDueDate(plant) {
  if (!plant.lastWatered || !plant.waterEveryDays) return null
  const due = parseDate(plant.lastWatered)
  due.setDate(due.getDate() + plant.waterEveryDays)
  return toDateString(due)
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Describes where a plant is in its watering cycle. tone: overdue | today | soon | ok | info | none.
export function wateringStatus(plant, today = todayString()) {
  const { lastWatered, waterEveryDays } = plant
  const due = nextDueDate(plant)
  if (due) {
    const diff = daysBetween(today, due)
    if (diff < 0) return { tone: 'overdue', label: `Overdue by ${plural(-diff, 'day')}`, needsWater: true, dueIn: diff }
    if (diff === 0) return { tone: 'today', label: 'Water today', needsWater: true, dueIn: 0 }
    return {
      tone: diff <= 1 ? 'soon' : 'ok',
      label: `Next watering in ${plural(diff, 'day')}`,
      needsWater: false,
      dueIn: diff,
    }
  }
  if (lastWatered) {
    const ago = daysBetween(lastWatered, today)
    return { tone: 'info', label: ago <= 0 ? 'Watered today' : `Watered ${plural(ago, 'day')} ago`, needsWater: false, dueIn: null }
  }
  if (waterEveryDays) {
    return { tone: 'info', label: `Every ${plural(waterEveryDays, 'day')}. Add a last watered date`, needsWater: false, dueIn: null }
  }
  return { tone: 'none', label: '', needsWater: false, dueIn: null }
}

export function parseWaterEvery(value) {
  if (value === '' || value === null || value === undefined) return { value: null }
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 365) {
    return { error: 'Enter a whole number of days between 1 and 365.' }
  }
  return { value: number }
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A to Z' },
  { value: 'watered', label: 'Longest since watered' },
  { value: 'due', label: 'Next watering due' },
]

function compareOptional(a, b) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

export function sortPlants(plants, sort, today = todayString()) {
  const list = [...plants]
  if (sort === 'name') {
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }
  if (sort === 'watered') {
    return list.sort((a, b) => compareOptional(
      a.lastWatered ? -daysBetween(a.lastWatered, today) : null,
      b.lastWatered ? -daysBetween(b.lastWatered, today) : null,
    ))
  }
  if (sort === 'due') {
    return list.sort((a, b) => compareOptional(wateringStatus(a, today).dueIn, wateringStatus(b, today).dueIn))
  }
  return list.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
}

export function filterPlants(plants, { query = '', recommendation = '' }) {
  const needle = query.trim().toLowerCase()
  return plants.filter((plant) => {
    if (recommendation && !plant.recommendations?.includes(recommendation)) return false
    if (!needle) return true
    const haystack = [plant.name, plant.careNote, ...(plant.recommendations ?? [])].join('\n').toLowerCase()
    return haystack.includes(needle)
  })
}
