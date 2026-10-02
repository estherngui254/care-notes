import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { fakeSupabase } from './fakeSupabase.js'

// Every test talks to an in-memory fake, never to the real Supabase project.
vi.mock('../supabaseClient.js', async () => {
  const { fakeSupabase: fake } = await import('./fakeSupabase.js')
  return { supabase: fake.client }
})

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = () => {}

// The app is only shown to someone who is signed in, so most tests start with a signed-in test
// account. The tests about signing in and registering start with nobody signed in instead.
export const TEST_USER = { name: 'Test User', email: 'test@example.com', password: 'test-password' }
const startsSignedOut = () => /accounts\./.test(expect.getState().testPath ?? '')

beforeEach(() => {
  fakeSupabase.reset()
  if (startsSignedOut()) return
  fakeSupabase.signInAs(fakeSupabase.addUser(TEST_USER))
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
})
