import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetLockouts } from '../accounts.js'

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetLockouts()
  document.body.classList.remove('dialog-open')
})
