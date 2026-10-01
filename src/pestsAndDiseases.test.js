import { describe, expect, it } from 'vitest'
import { PROBLEMS, SYMPTOMS, findProblem, matchProblems } from './pestsAndDiseases.js'
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
    expect(plant.issues[1]).toMatchObject({ photo: '', resolved: false, symptoms: [] })
  })
})
