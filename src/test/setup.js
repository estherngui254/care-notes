import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import { registerUser, resetLockouts } from '../accounts.js'

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = () => {}

// The app is only shown to someone who is signed in, so most tests start with a signed-in test
// account. The tests about accounts and signing in start with nobody signed in instead.
const startsSignedOut = () => /accounts\./.test(expect.getState().testPath ?? '')

beforeEach(async () => {
  if (startsSignedOut()) return
  await registerUser({ name: 'Test User', email: 'test@example.com', password: 'test-password', confirm: 'test-password' })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetLockouts()
})
