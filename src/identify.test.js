import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PROVIDER, GEMINI_MODEL, MODEL, RESULT_SCHEMA, ScanError, buildGeminiRequest, buildRequest, friendlyError, identifyPlant,
  normalizeResult, parseGeminiResponse, parseResult,
} from './identify.js'

const IMAGE = 'data:image/jpeg;base64,QUJD'

function good(overrides = {}) {
  return {
    plant: { identified: true, commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 'high', alternatives: [] },
    care: {
      light: 'Bright indirect light.', water: 'Water when the top inch is dry.', humidity: 'Average.',
      temperature: '18 to 29 C.', soil: 'Well-draining mix.', fertiliser: 'Monthly in summer.',
      petSafety: 'Toxic to pets.', waterEveryDays: 7, recommendations: ['Water weekly'],
    },
    health: { overall: 'healthy', summary: 'No problems seen.', findings: [] },
    photoAdvice: '',
    ...overrides,
  }
}

const message = (payload, extra = {}) => ({
  stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(payload) }], ...extra,
})

function objectSchemas(schema, found = []) {
  if (schema?.type === 'object') {
    found.push(schema)
    Object.values(schema.properties).forEach((child) => objectSchemas(child, found))
  }
  if (schema?.type === 'array') objectSchemas(schema.items, found)
  return found
}

describe('request', () => {
  it('builds a structured-output request with images before the text', () => {
    const request = buildRequest([IMAGE, IMAGE])
    expect(request.model).toBe(MODEL)
    expect(request.model).toBe('claude-opus-5-5')
    expect(request.output_config.format.type).toBe('json_schema')
    expect(request.betas).toContain('server-side-fallback-2026-07-01')
    expect(request.fallbacks).toBe('default')
    const content = request.messages[0].content
    expect(content.map((block) => block.type)).toEqual(['image', 'image', 'text'])
    expect(content[0].source).toEqual({ type: 'base64', media_type: 'image/jpeg', data: 'QUJD' })
    expect(content[2].text).toMatch(/these 2 photos/i)
  })

  it('does not send settings that newer models reject', () => {
    const request = buildRequest([IMAGE])
    for (const key of ['temperature', 'top_p', 'top_k', 'thinking', 'tool_choice']) expect(request).not.toHaveProperty(key)
    expect(request.messages.at(-1).role).toBe('user')
  })

  it('has a schema where every object is closed and fully required', () => {
    const objects = objectSchemas(RESULT_SCHEMA)
    expect(objects.length).toBeGreaterThan(3)
    for (const object of objects) {
      expect(object.additionalProperties).toBe(false)
      expect([...object.required].sort()).toEqual(Object.keys(object.properties).sort())
    }
  })
})

describe('parseResult', () => {
  it('parses a good answer', () => {
    const result = parseResult(message(good()))
    expect(result.plant).toMatchObject({ identified: true, commonName: 'Pothos', confidence: 'high' })
    expect(result.care.waterEveryDays).toBe(7)
    expect(result.health.overall).toBe('healthy')
  })

  it('reports refusals, truncation and unreadable answers', () => {
    expect(() => parseResult({ stop_reason: 'refusal', content: [] })).toThrow(expect.objectContaining({ code: 'refused' }))
    expect(() => parseResult({ stop_reason: 'max_tokens', content: [] })).toThrow(expect.objectContaining({ code: 'truncated' }))
    expect(() => parseResult({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] })).toThrow(ScanError)
    expect(() => parseResult(message({ plant: {} }))).toThrow(expect.objectContaining({ code: 'invalid' }))
  })

  it('cleans up values that do not fit the app', () => {
    const result = normalizeResult(good({
      plant: { identified: true, commonName: '', scientificName: 'x', confidence: 'certain', alternatives: ['A', '', 'B', 'C', 'D'] },
      care: { ...good().care, waterEveryDays: 0, recommendations: ['Water weekly', 'Made up advice'] },
      health: {
        overall: 'dire',
        summary: 's',
        findings: [
          { type: 'pest', name: 'Mealybugs', matchedProblem: 'Mealybugs', confidence: 'high', signs: 'White fluff', actions: ['Isolate'] },
          { type: 'weird', name: 'Mystery', matchedProblem: 'Not in list', confidence: 'maybe', signs: '', actions: [] },
          { type: 'pest', name: '', matchedProblem: 'Other', confidence: 'low', signs: '', actions: [] },
        ],
      },
    }))
    expect(result.plant.identified).toBe(false)
    expect(result.plant.confidence).toBe('low')
    expect(result.plant.alternatives).toEqual(['A', 'B', 'C'])
    expect(result.care.waterEveryDays).toBeNull()
    expect(result.care.recommendations).toEqual(['Water weekly'])
    expect(result.health.overall).toBe('unclear')
    expect(result.health.findings).toHaveLength(2)
    expect(result.health.findings[1]).toMatchObject({ type: 'other', matchedProblem: 'Other', confidence: 'low' })
  })
})

describe('friendlyError', () => {
  it('explains common failures without exposing raw errors', () => {
    expect(friendlyError({ status: 401 })).toMatch(/key was not accepted/i)
    expect(friendlyError({ status: 403 })).toMatch(/permission/i)
    expect(friendlyError({ status: 404 })).toMatch(/model is not available/i)
    expect(friendlyError({ status: 429 })).toMatch(/usage limit/i)
    expect(friendlyError({ status: 400, message: 'Your credit balance is too low' })).toMatch(/no credit/i)
    expect(friendlyError({ status: 400, message: 'bad image' })).toMatch(/could not be processed/i)
    expect(friendlyError({ status: 529 })).toMatch(/busy/i)
    expect(friendlyError({ name: 'APIConnectionError' })).toMatch(/internet/i)
    expect(friendlyError(new ScanError('Custom message', 'invalid'))).toBe('Custom message')
    expect(friendlyError(new Error('secret detail'))).not.toMatch(/secret detail/)
  })
})

describe('identifyPlant with Claude', () => {
  it('sends one request through the client and returns the parsed result', async () => {
    const create = vi.fn().mockResolvedValue(message(good()))
    const result = await identifyPlant({ provider: 'claude', apiKey: 'k', images: [IMAGE], client: { beta: { messages: { create } } } })
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].model).toBe('claude-opus-5-5')
    expect(result.plant.commonName).toBe('Pothos')
  })

  it('passes API errors through for friendlyError to describe', async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { status: 401 }))
    await expect(identifyPlant({ provider: 'claude', apiKey: 'k', images: [IMAGE], client: { beta: { messages: { create } } } }))
      .rejects.toMatchObject({ status: 401 })
  })
})

const geminiAnswer = (payload, extra = {}) => ({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(payload) }] }, ...extra }],
})
const okResponse = (data) => ({ ok: true, status: 200, json: async () => data })
const errorResponse = (status, error) => ({ ok: false, status, json: async () => ({ error }) })

describe('Gemini request', () => {
  it('sends images and a JSON schema, with the key in a header', () => {
    const body = buildGeminiRequest([IMAGE, IMAGE])
    const parts = body.contents[0].parts
    expect(parts.map((part) => Object.keys(part)[0])).toEqual(['inlineData', 'inlineData', 'text'])
    expect(parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' })
    expect(body.systemInstruction.parts[0].text).toMatch(/plant care assistant/i)
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseJsonSchema: RESULT_SCHEMA })
  })

  it('posts to the Gemini model endpoint and returns the parsed result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse(geminiAnswer(good())))
    const result = await identifyPlant({ provider: 'gemini', apiKey: 'AIza-test', images: [IMAGE], fetchFn })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, options] = fetchFn.mock.calls[0]
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`)
    expect(options.method).toBe('POST')
    expect(options.headers['x-goog-api-key']).toBe('AIza-test')
    expect(url).not.toContain('AIza-test')
    expect(JSON.parse(options.body).contents[0].parts[0].inlineData.data).toBe('QUJD')
    expect(result.plant.commonName).toBe('Pothos')
  })

  it('defaults to Gemini when no provider is given', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse(geminiAnswer(good())))
    await identifyPlant({ apiKey: 'k', images: [IMAGE], fetchFn })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(DEFAULT_PROVIDER).toBe('gemini')
  })
})

describe('Gemini response', () => {
  it('ignores thought parts and joins the text', () => {
    const json = JSON.stringify(good())
    const data = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thinking...', thought: true }, { text: json.slice(0, 20) }, { text: json.slice(20) }] } }] }
    expect(parseGeminiResponse(data).plant.commonName).toBe('Pothos')
  })

  it('reports blocked, truncated, empty and unreadable answers', () => {
    expect(() => parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(expect.objectContaining({ code: 'refused' }))
    expect(() => parseGeminiResponse(geminiAnswer(good(), { finishReason: 'SAFETY' }))).toThrow(expect.objectContaining({ code: 'refused' }))
    expect(() => parseGeminiResponse(geminiAnswer(good(), { finishReason: 'MAX_TOKENS' }))).toThrow(expect.objectContaining({ code: 'truncated' }))
    expect(() => parseGeminiResponse({ candidates: [] })).toThrow(expect.objectContaining({ code: 'invalid' }))
    expect(() => parseGeminiResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'nope' }] } }] }))
      .toThrow(expect.objectContaining({ code: 'invalid' }))
  })

  it('turns an invalid key response into a friendly message', async () => {
    const fetchFn = vi.fn().mockResolvedValue(errorResponse(400, {
      message: 'API key not valid. Please pass a valid API key.',
      details: [{ reason: 'API_KEY_INVALID' }],
    }))
    const error = await identifyPlant({ provider: 'gemini', apiKey: 'bad', images: [IMAGE], fetchFn }).catch((problem) => problem)
    expect(error.status).toBe(400)
    expect(error.reason).toBe('API_KEY_INVALID')
    expect(friendlyError(error)).toMatch(/key was not accepted/i)
  })

  it('describes quota and permission errors', async () => {
    const quota = await identifyPlant({
      provider: 'gemini', apiKey: 'k', images: [IMAGE], fetchFn: vi.fn().mockResolvedValue(errorResponse(429, { message: 'Quota exceeded' })),
    }).catch((problem) => problem)
    expect(friendlyError(quota)).toMatch(/usage limit/i)

    const denied = await identifyPlant({
      provider: 'gemini', apiKey: 'k', images: [IMAGE], fetchFn: vi.fn().mockResolvedValue(errorResponse(403, { message: 'denied' })),
    }).catch((problem) => problem)
    expect(friendlyError(denied)).toMatch(/permission/i)
  })

  it('survives an error response that is not JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => { throw new Error('not json') } })
    const error = await identifyPlant({ provider: 'gemini', apiKey: 'k', images: [IMAGE], fetchFn, retryDelayMs: 0 }).catch((problem) => problem)
    expect(error.status).toBe(503)
    expect(friendlyError(error)).toMatch(/busy/i)
  })

  it('retries when Gemini is briefly overloaded, then succeeds', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(errorResponse(503, { message: 'high demand', status: 'UNAVAILABLE' }))
      .mockResolvedValueOnce(errorResponse(503, { message: 'high demand', status: 'UNAVAILABLE' }))
      .mockResolvedValueOnce(okResponse(geminiAnswer(good())))
    const result = await identifyPlant({ provider: 'gemini', apiKey: 'k', images: [IMAGE], fetchFn, retryDelayMs: 0 })
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(result.plant.commonName).toBe('Pothos')
  })

  it('gives up after three overloaded attempts', async () => {
    const fetchFn = vi.fn().mockResolvedValue(errorResponse(503, { message: 'high demand' }))
    const error = await identifyPlant({ provider: 'gemini', apiKey: 'k', images: [IMAGE], fetchFn, retryDelayMs: 0 }).catch((problem) => problem)
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(friendlyError(error)).toMatch(/busy/i)
  })

  it('does not retry other errors', async () => {
    const fetchFn = vi.fn().mockResolvedValue(errorResponse(429, { message: 'quota' }))
    await identifyPlant({ provider: 'gemini', apiKey: 'k', images: [IMAGE], fetchFn, retryDelayMs: 0 }).catch(() => {})
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
