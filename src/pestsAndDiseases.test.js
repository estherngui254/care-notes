import { describe, expect, it } from 'vitest'
import {
  KIND_LABELS, PROBLEMS, SYMPTOMS, findProblem, kindsFor, matchProblems, symptomsFor,
} from './pestsAndDiseases.js'
import { normalizePlants } from './storage.js'

describe('pest and disease data', () => {
  it('only uses symptoms from the symptom list', () => {
    for (const problem of PROBLEMS) {
      for (const sign of problem.signs) expect(SYMPTOMS, `${problem.name}: ${sign}`).toContain(sign)
    }
  })

  it('gives every problem a unique id, a name and treatment steps', () => {
    expect(new Set(PROBLEMS.map((problem) => problem.id)).size).toBe(PROBLEMS.length)
    for (const problem of PROBLEMS) {
      expect(problem.name).toBeTruthy()
      expect(problem.treatment.length).toBeGreaterThan(0)
    }
  })

  it('gives every problem a full management plan', () => {
    for (const problem of PROBLEMS) {
      expect(problem.prevention.length, `${problem.name} prevention`).toBeGreaterThan(0)
      expect(problem.monitor, `${problem.name} monitor`).toBeTruthy()
      expect(problem.getHelp, `${problem.name} getHelp`).toBeTruthy()
      expect(KIND_LABELS[problem.kind], `${problem.name} kind`).toBeTruthy()
    }
  })

  it('covers the main nutrient deficiencies', () => {
    const names = PROBLEMS.filter((problem) => problem.kind === 'deficiency').map((problem) => problem.name)
    for (const nutrient of ['Nitrogen', 'Phosphorus', 'Potassium', 'Magnesium', 'Iron', 'Calcium']) {
      expect(names).toContain(`${nutrient} deficiency`)
    }
  })

  it('uses every symptom in at least one problem', () => {
    for (const symptom of SYMPTOMS) {
      expect(PROBLEMS.some((problem) => problem.signs.includes(symptom)), symptom).toBe(true)
    }
  })
})

describe('matchProblems', () => {
  it('returns nothing when no symptoms are chosen', () => {
    expect(matchProblems([])).toEqual([])
  })

  it('ranks the problem sharing the most symptoms first', () => {
    const [first] = matchProblems(['Fine webbing on leaves', 'Silvery streaks or speckling'])
    expect(first.problem.name).toBe('Spider mites')
    expect(first.matched).toHaveLength(2)
  })

  it('finds root rot from soggy-plant symptoms', () => {
    const [first] = matchProblems(['Mushy stems or base', 'Wilting despite moist soil'])
    expect(first.problem.name).toBe('Root rot')
  })

  it('limits the number of matches', () => {
    expect(matchProblems(['Yellowing leaves'], 2)).toHaveLength(2)
  })

  it('ranks deficiencies from nutrient symptoms', () => {
    expect(matchProblems(['Yellowing between veins on new leaves'])[0].problem.name).toBe('Iron deficiency')
    expect(matchProblems(['Purple or reddish tinge on leaves', 'Few or no flowers'])[0].problem.name).toBe('Phosphorus deficiency')
    expect(matchProblems(['Yellowing between veins on older leaves'])[0].problem.name).toBe('Magnesium deficiency')
  })

  it('limits matches to the kinds for the chosen category', () => {
    expect(matchProblems(['Lower leaves yellowing evenly'], 3, kindsFor('pest'))).toEqual([])
    expect(matchProblems(['Lower leaves yellowing evenly'], 3, kindsFor('nutrient'))[0].problem.name).toBe('Nitrogen deficiency')
    expect(matchProblems(['Fine webbing on leaves'], 3, kindsFor('nutrient'))).toEqual([])
  })

  it('offers only the symptoms that belong to each category', () => {
    expect(symptomsFor('pest')).toContain('Fine webbing on leaves')
    expect(symptomsFor('pest')).not.toContain('Purple or reddish tinge on leaves')
    expect(symptomsFor('nutrient')).toContain('Purple or reddish tinge on leaves')
    expect(symptomsFor('nutrient')).not.toContain('Fine webbing on leaves')
    expect(symptomsFor('all')).toEqual(SYMPTOMS)
  })

  it('finds a problem by name', () => {
    expect(findProblem('Mealybugs')?.id).toBe('mealybugs')
    expect(findProblem('Unknown')).toBeNull()
  })
})

describe('saved issues', () => {
  const base = { id: 'p1', name: 'Fern', careNote: 'x' }

  it('defaults to no issues and drops malformed ones', () => {
    expect(normalizePlants([base])[0].issues).toEqual([])
    const [plant] = normalizePlants([{
      ...base,
      issues: [
        { id: 'i1', date: '2026-09-30', suspected: 'Mealybugs', symptoms: ['Cottony white clumps', 5], notes: 'n', resolved: true, photo: 'data:image/jpeg;base64,AAA' },
        { date: 'no id' },
        null,
        { id: 'i2', photo: 'http://evil.example/x.png' },
      ],
    }])
    expect(plant.issues).toHaveLength(2)
    expect(plant.issues[0]).toMatchObject({ resolved: true, symptoms: ['Cottony white clumps'] })
    expect(plant.issues[1]).toMatchObject({ photo: '', resolved: false, symptoms: [], stepsDone: [] })
  })

  it('keeps completed steps as strings only', () => {
    const [plant] = normalizePlants([{ ...base, issues: [{ id: 'i1', stepsDone: ['Isolate the plant.', 3, null] }] }])
    expect(plant.issues[0].stepsDone).toEqual(['Isolate the plant.'])
  })
})
