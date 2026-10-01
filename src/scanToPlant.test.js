import { describe, expect, it } from 'vitest'
import { plantFromScan } from './scanToPlant.js'

function result(overrides = {}) {
  return {
    plant: { identified: true, commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 'high', alternatives: [] },
    care: {
      light: 'Bright indirect light.', water: 'Water when the top inch is dry.', humidity: 'Average.', temperature: '',
      soil: '', fertiliser: '', petSafety: 'Toxic to pets.', waterEveryDays: 7, recommendations: ['Water weekly'],
    },
    health: { overall: 'healthy', summary: '', findings: [] },
    photoAdvice: '',
    ...overrides,
  }
}

const options = { photo: 'data:image/jpeg;base64,P', issuePhoto: 'data:image/jpeg;base64,I', date: '2026-10-01' }

describe('plantFromScan', () => {
  it('turns a healthy scan into a plant with a care profile and no issues', () => {
    const plant = plantFromScan(result(), options)
    expect(plant).toMatchObject({
      name: 'Pothos', waterEveryDays: 7, recommendations: ['Water weekly'], photo: options.photo, issues: [],
    })
    expect(plant.careNote).toBe('Light: Bright indirect light. Water: Water when the top inch is dry.')
    expect(plant.careProfile).toMatchObject({ scientificName: 'Epipremnum aureum', petSafety: 'Toxic to pets.' })
  })

  it('keeps the care note within the form limit', () => {
    const long = 'x'.repeat(400)
    const plant = plantFromScan(result({ care: { ...result().care, light: long } }), options)
    expect(plant.careNote.length).toBeLessThanOrEqual(240)
  })

  it('uses a plain note when there is no light or water advice', () => {
    const care = { ...result().care, light: '', water: '' }
    expect(plantFromScan(result({ care }), options).careNote).toBe('Identified from a photo.')
  })

  it('records findings as open problems, with the photo on the first', () => {
    const health = {
      overall: 'needs_attention',
      summary: '',
      findings: [
        { type: 'pest', name: 'Mealybugs', matchedProblem: 'Mealybugs', confidence: 'high', signs: 'White fluff in leaf joints.', actions: [] },
        { type: 'other', name: 'Sunburn', matchedProblem: 'Other', confidence: 'medium', signs: 'Bleached patches.', actions: [] },
      ],
    }
    const { issues } = plantFromScan(result({ health }), options)
    expect(issues).toHaveLength(2)
    expect(issues[0]).toMatchObject({ suspected: 'Mealybugs', photo: options.issuePhoto, resolved: false, date: '2026-10-01', stepsDone: [] })
    expect(issues[0].notes).toMatch(/found by photo scan \(high confidence\)/i)
    expect(issues[1]).toMatchObject({ suspected: '', photo: '' })
    expect(issues[1].notes).toMatch(/Sunburn: Bleached patches/)
    expect(new Set(issues.map((issue) => issue.id)).size).toBe(2)
  })

  it('leaves the care profile empty when nothing was described', () => {
    const empty = { light: '', water: '', humidity: '', temperature: '', soil: '', fertiliser: '', petSafety: '', waterEveryDays: null, recommendations: [] }
    const plant = plantFromScan(result({ plant: { ...result().plant, scientificName: '' }, care: empty }), options)
    expect(plant.careProfile).toBeNull()
  })
})
