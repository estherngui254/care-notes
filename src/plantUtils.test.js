import { describe, expect, it } from 'vitest'
import {
  daysBetween, filterPlants, nextDueDate, parseWaterEvery, sortPlants, wateringStatus,
} from './plantUtils.js'

const TODAY = '2026-09-30'

describe('watering status', () => {
  it('counts calendar days between dates', () => {
    expect(daysBetween('2026-09-20', TODAY)).toBe(10)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('computes the next due date', () => {
    expect(nextDueDate({ lastWatered: '2026-09-25', waterEveryDays: 7 })).toBe('2026-10-02')
    expect(nextDueDate({ lastWatered: '2026-09-25' })).toBeNull()
  })

  it('flags overdue, due today and upcoming plants', () => {
    expect(wateringStatus({ lastWatered: '2026-09-20', waterEveryDays: 7 }, TODAY))
      .toMatchObject({ tone: 'overdue', label: 'Overdue by 3 days', needsWater: true })
    expect(wateringStatus({ lastWatered: '2026-09-23', waterEveryDays: 7 }, TODAY))
      .toMatchObject({ tone: 'today', needsWater: true })
    expect(wateringStatus({ lastWatered: '2026-09-29', waterEveryDays: 7 }, TODAY))
      .toMatchObject({ tone: 'ok', label: 'Next watering in 6 days', needsWater: false })
  })

  it('describes plants without a schedule', () => {
    expect(wateringStatus({ lastWatered: '2026-09-18' }, TODAY).label).toBe('Watered 12 days ago')
    expect(wateringStatus({ lastWatered: TODAY }, TODAY).label).toBe('Watered today')
    expect(wateringStatus({ waterEveryDays: 5 }, TODAY).label).toMatch(/add a last watered date/i)
    expect(wateringStatus({}, TODAY).tone).toBe('none')
  })

  it('validates the watering interval', () => {
    expect(parseWaterEvery('')).toEqual({ value: null })
    expect(parseWaterEvery('7')).toEqual({ value: 7 })
    expect(parseWaterEvery('0').error).toBeTruthy()
    expect(parseWaterEvery('2.5').error).toBeTruthy()
    expect(parseWaterEvery('400').error).toBeTruthy()
  })
})

describe('sorting and filtering', () => {
  const plants = [
    { id: '1', name: 'pothos', careNote: 'easy', createdAt: '2026-09-01', lastWatered: '2026-09-28', waterEveryDays: 7, recommendations: ['Water weekly'] },
    { id: '2', name: 'Aloe', careNote: 'sun', createdAt: '2026-09-03', lastWatered: '2026-09-10', waterEveryDays: 14, recommendations: ['Bright direct light'] },
    { id: '3', name: 'Fern', careNote: 'mist', createdAt: '2026-09-02', recommendations: [] },
  ]
  const ids = (list) => list.map((plant) => plant.id)

  it('sorts by each option', () => {
    expect(ids(sortPlants(plants, 'newest', TODAY))).toEqual(['2', '3', '1'])
    expect(ids(sortPlants(plants, 'name', TODAY))).toEqual(['2', '3', '1'])
    expect(ids(sortPlants(plants, 'watered', TODAY))).toEqual(['2', '1', '3'])
    expect(ids(sortPlants(plants, 'due', TODAY))).toEqual(['2', '1', '3'])
  })

  it('does not mutate the input list', () => {
    const copy = [...plants]
    sortPlants(plants, 'name', TODAY)
    expect(plants).toEqual(copy)
  })

  it('filters by search text and recommendation', () => {
    expect(ids(filterPlants(plants, { query: 'ALOE' }))).toEqual(['2'])
    expect(ids(filterPlants(plants, { query: 'mist' }))).toEqual(['3'])
    expect(ids(filterPlants(plants, { query: 'weekly' }))).toEqual(['1'])
    expect(ids(filterPlants(plants, { recommendation: 'Bright direct light' }))).toEqual(['2'])
    expect(ids(filterPlants(plants, { query: '', recommendation: '' }))).toEqual(['1', '2', '3'])
  })
})
