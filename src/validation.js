export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 128
export const MAX_NAME = 40

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const normalizeEmail = (email) => email.trim().toLowerCase()

export function validateEmail(email) {
  if (!email.trim()) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address, like name@example.com.'
  return ''
}

export function validatePassword(password) {
  if (!password) return 'Choose a password.'
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (password.length > MAX_PASSWORD) return `Use no more than ${MAX_PASSWORD} characters.`
  return ''
}

export function validateRegistration({ name, email, password, confirm }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter your name.'
  else if (name.trim().length > MAX_NAME) errors.name = `Keep your name under ${MAX_NAME} characters.`
  const emailProblem = validateEmail(email)
  if (emailProblem) errors.email = emailProblem
  const passwordProblem = validatePassword(password)
  if (passwordProblem) errors.password = passwordProblem
  else if (password !== confirm) errors.confirm = 'The passwords do not match.'
  return errors
}
