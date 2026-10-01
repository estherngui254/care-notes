import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./photo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  compressImage: vi.fn(async () => 'data:image/jpeg;base64,AAAA'),
  resizeDataUrl: vi.fn(async () => 'data:image/jpeg;base64,BBBB'),
}))
vi.mock('./identify.js', async (importOriginal) => ({
  ...(await importOriginal()),
  identifyPlant: vi.fn(),
}))

import App from './App.jsx'
import PlantScanner from './PlantScanner.jsx'
import { identifyPlant } from './identify.js'

const RESULT = {
  plant: { identified: true, commonName: 'Peace Lily', scientificName: 'Spathiphyllum', confidence: 'medium', alternatives: ['Anthurium'] },
  care: {
    light: 'Low to medium indirect light.', water: 'Keep evenly moist.', humidity: 'Likes humidity.', temperature: '',
    soil: '', fertiliser: '', petSafety: 'Toxic to pets.', waterEveryDays: 7, recommendations: ['Water weekly', 'Mist the leaves regularly'],
  },
  health: {
    overall: 'needs_attention',
    summary: 'Some pest activity on the stems.',
    findings: [{
      type: 'pest', name: 'Mealybugs', matchedProblem: 'Mealybugs', confidence: 'high',
      signs: 'Cottony white clumps in the leaf joints.', actions: ['Dab each insect with an alcohol swab.'],
    }],
  },
  photoAdvice: '',
}

const photoFile = (name = 'plant.jpg') => new File(['x'], name, { type: 'image/jpeg' })

function setup(props = {}) {
  const onSavePlant = vi.fn()
  const identify = vi.fn().mockResolvedValue(RESULT)
  const user = userEvent.setup({ applyAccept: false })
  render(<PlantScanner onSavePlant={onSavePlant} identify={identify} {...props} />)
  return { user, onSavePlant, identify }
}

beforeEach(() => {
  identifyPlant.mockReset()
})

describe('API key', () => {
  it('offers the free Gemini service first, stores the key, and lets it be removed', async () => {
    const { user } = setup()
    expect(screen.getByText(/needs your own api key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/google gemini \(free tier\)/i)).toBeChecked()
    expect(screen.getByRole('link', { name: /google ai studio/i })).toHaveAttribute('href', 'https://aistudio.google.com/apikey')
    expect(screen.getByText(/google may use your photos/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /identify/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save key/i }))
    expect(screen.getByText(/paste your api key first/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/gemini api key/i), 'AIza-test')
    await user.click(screen.getByRole('button', { name: /save key/i }))
    expect(window.localStorage.getItem('plant-care-notes-api-key-gemini')).toBe('AIza-test')
    expect(window.localStorage.getItem('plant-care-notes-provider')).toBe('gemini')
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
    expect(screen.getByText(/sent to google/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove key/i }))
    expect(window.localStorage.getItem('plant-care-notes-api-key-gemini')).toBeNull()
    expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument()
  })

  it('lets you choose paid Claude instead and uses it for scans', async () => {
    const { user, identify } = setup()
    await user.click(screen.getByLabelText(/claude \(paid\)/i))
    expect(screen.getByRole('link', { name: /anthropic console/i })).toBeInTheDocument()
    expect(screen.queryByText(/google may use your photos/i)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/claude api key/i), 'sk-ant-test')
    await user.click(screen.getByRole('button', { name: /save key/i }))
    expect(window.localStorage.getItem('plant-care-notes-api-key-claude')).toBe('sk-ant-test')
    expect(window.localStorage.getItem('plant-care-notes-provider')).toBe('claude')
    expect(screen.getByText(/sent to anthropic/i)).toBeInTheDocument()

    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    expect(identify).toHaveBeenCalledWith({ provider: 'claude', apiKey: 'sk-ant-test', images: ['data:image/jpeg;base64,AAAA'] })
  })

  it('keeps using a Claude key saved by an earlier version', () => {
    window.localStorage.setItem('plant-care-notes-api-key', 'sk-ant-old')
    setup()
    expect(screen.getByText(/using claude/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
  })

  it('does not put the key in a backup export', async () => {
    window.localStorage.setItem('plant-care-notes-api-key-gemini', 'AIza-secret')
    const { buildBackup } = await import('./storage.js')
    expect(buildBackup([])).not.toContain('AIza-secret')
  })
})

describe('scanning', () => {
  beforeEach(() => window.localStorage.setItem('plant-care-notes-api-key-gemini', 'AIza-test'))

  it('needs a photo before it can identify', () => {
    setup()
    expect(screen.getByRole('button', { name: /identify and check health/i })).toBeDisabled()
  })

  it('sends the photos and key, then shows the plant, care needs and health findings', async () => {
    const { user, identify } = setup()
    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    expect(await screen.findByAltText('Photo 1 of the plant')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    expect(identify).toHaveBeenCalledWith({ provider: 'gemini', apiKey: 'AIza-test', images: ['data:image/jpeg;base64,AAAA'] })

    const region = await screen.findByRole('region', { name: /scan result/i })
    expect(within(region).getByText('Peace Lily')).toBeInTheDocument()
    expect(within(region).getByText('Spathiphyllum')).toBeInTheDocument()
    expect(within(region).getByText(/could also be: anthurium/i)).toBeInTheDocument()
    expect(within(region).getByText('Low to medium indirect light.')).toBeInTheDocument()
    expect(within(region).getByText(/about 7 days/i)).toBeInTheDocument()
    expect(within(region).getByText('Needs attention')).toBeInTheDocument()
    const findings = within(region).getByRole('list', { name: /health findings/i })
    expect(within(findings).getByText('Mealybugs')).toBeInTheDocument()
    expect(within(findings).getByText('Pest')).toBeInTheDocument()
    expect(within(findings).getByText(/dab each insect/i)).toBeInTheDocument()
  })

  it('allows at most three photos', async () => {
    const { user } = setup()
    await user.upload(screen.getByLabelText('Choose photos'), [photoFile('1.jpg'), photoFile('2.jpg'), photoFile('3.jpg'), photoFile('4.jpg')])
    expect(await screen.findAllByRole('img')).toHaveLength(3)
    expect(screen.getByRole('alert')).toHaveTextContent(/extra ones were skipped/i)
    expect(screen.getByRole('button', { name: /choose photos/i })).toBeDisabled()
  })

  it('removes a photo and clears an earlier result', async () => {
    const { user } = setup()
    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    await screen.findByRole('region', { name: /scan result/i })
    await user.click(screen.getByRole('button', { name: /remove photo 1/i }))
    expect(screen.queryByRole('region', { name: /scan result/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /identify and check health/i })).toBeDisabled()
  })

  it('explains a failure in plain words', async () => {
    const { user } = setup({ identify: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 401 })) })
    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    expect(await screen.findByText(/api key was not accepted/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /scan result/i })).not.toBeInTheDocument()
  })

  it('reports an unidentified plant and offers no save button', async () => {
    const unknown = { ...RESULT, plant: { ...RESULT.plant, identified: false, commonName: '' }, photoAdvice: 'Take a closer photo of a leaf.' }
    const { user } = setup({ identify: vi.fn().mockResolvedValue(unknown) })
    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    expect(await screen.findByText(/could not be identified/i)).toBeInTheDocument()
    expect(screen.getByText(/closer photo of a leaf/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save as a plant/i })).not.toBeInTheDocument()
  })

  it('warns when offline without calling the service', async () => {
    const { user, identify } = setup()
    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
    expect(identify).not.toHaveBeenCalled()
    online.mockRestore()
  })

  it('saves the result as a plant', async () => {
    const { user, onSavePlant } = setup()
    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    await user.click(await screen.findByRole('button', { name: /save as a plant/i }))

    expect(onSavePlant).toHaveBeenCalledTimes(1)
    const plant = onSavePlant.mock.calls[0][0]
    expect(plant).toMatchObject({
      name: 'Peace Lily', waterEveryDays: 7, photo: 'data:image/jpeg;base64,BBBB',
      recommendations: ['Water weekly', 'Mist the leaves regularly'],
    })
    expect(plant.issues).toHaveLength(1)
    expect(plant.issues[0].suspected).toBe('Mealybugs')
    expect(await screen.findByText(/saved peace lily/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save as a plant/i })).not.toBeInTheDocument()
  })
})

describe('in the app', () => {
  it('adds the scanned plant to the list with its care requirements and problems', async () => {
    window.localStorage.setItem('plant-care-notes-api-key-gemini', 'AIza-test')
    identifyPlant.mockResolvedValue(RESULT)
    const user = userEvent.setup({ applyAccept: false })
    render(<App />)

    await user.upload(screen.getByLabelText('Choose photos'), photoFile())
    await user.click(screen.getByRole('button', { name: /identify and check health/i }))
    await user.click(await screen.findByRole('button', { name: /save as a plant/i }))

    const list = await screen.findByRole('list', { name: /your plants/i })
    expect(within(list).getByRole('heading', { name: 'Peace Lily' })).toBeInTheDocument()
    expect(within(list).getByText(/plant health \(1 open\)/i)).toBeInTheDocument()
    expect(within(list).getByText(/care requirements/i, { selector: 'summary' })).toBeInTheDocument()
    expect(within(list).getByText('Toxic to pets.')).toBeInTheDocument()
    expect(within(list).getByAltText('Photo of Peace Lily')).toBeInTheDocument()
    expect(within(list).getByText(/found by photo scan/i)).toBeInTheDocument()
  })
})
