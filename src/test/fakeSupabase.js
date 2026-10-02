// An in-memory stand-in for the Supabase client, used by the tests so they never touch the real
// project. It follows the real service where it matters: email confirmation, the same answer for a
// wrong email and a wrong password, and Row Level Security (a person only ever sees their own rows).

function createFake() {
  const listeners = new Set()
  const state = {}

  function reset() {
    listeners.clear()
    Object.assign(state, {
      users: [],
      session: null,
      rows: [], // { user_id, id, data }
      emails: [], // what would have been emailed
      confirmRequired: true,
      offline: false,
      tableMissing: false,
      failWrites: 0,
      selectDelay: 0,
      rateLimited: false,
      rpcError: null,
      calls: [],
    })
  }

  const publicUser = (user) => ({ id: user.id, email: user.email, user_metadata: user.metadata })
  const sessionFor = (user) => ({ access_token: 'fake-token', user: publicUser(user) })
  // The real library keeps the session in localStorage under a key like this, and the app reads it.
  const STORAGE_KEY = 'sb-fakeproject-auth-token'
  function saveSession(session) {
    state.session = session
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_KEY)
  }
  const emit = (event) => { for (const listener of [...listeners]) listener(event, state.session) }
  const authError = (code, message, status = 400) => Object.assign(new Error(message), { code, status, name: 'AuthApiError' })
  const offlineError = () => Object.assign(new TypeError('Failed to fetch'), { name: 'AuthRetryableFetchError' })

  const auth = {
    async getSession() {
      return { data: { session: state.session }, error: null }
    },
    onAuthStateChange(callback) {
      listeners.add(callback)
      queueMicrotask(() => callback('INITIAL_SESSION', state.session))
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
    },
    async signUp({ email, password, options }) {
      if (state.offline) throw offlineError()
      state.calls.push(['signUp', email, options])
      if (state.users.some((user) => user.email === email)) {
        // The real service answers the same way for an address that is already registered.
        return { data: { user: { id: 'obfuscated', email, identities: [] }, session: null }, error: null }
      }
      const user = { id: crypto.randomUUID(), email, password, metadata: options?.data ?? {}, confirmed: !state.confirmRequired }
      state.users.push(user)
      if (!user.confirmed) {
        state.emails.push({ type: 'signup', email })
        return { data: { user: publicUser(user), session: null }, error: null }
      }
      saveSession(sessionFor(user))
      emit('SIGNED_IN')
      return { data: { user: publicUser(user), session: state.session }, error: null }
    },
    async signInWithPassword({ email, password }) {
      if (state.offline) throw offlineError()
      state.calls.push(['signIn', email])
      const user = state.users.find((candidate) => candidate.email === email)
      if (!user || user.password !== password) {
        return { data: { user: null, session: null }, error: authError('invalid_credentials', 'Invalid login credentials') }
      }
      if (!user.confirmed) {
        return { data: { user: null, session: null }, error: authError('email_not_confirmed', 'Email not confirmed') }
      }
      saveSession(sessionFor(user))
      emit('SIGNED_IN')
      return { data: { user: publicUser(user), session: state.session }, error: null }
    },
    async signOut() {
      saveSession(null)
      emit('SIGNED_OUT')
      return { error: null }
    },
    async resend({ type, email }) {
      if (state.rateLimited) return { data: null, error: authError('over_email_send_rate_limit', 'Rate limit', 429) }
      state.emails.push({ type: `resend-${type}`, email })
      return { data: {}, error: null }
    },
    async resetPasswordForEmail(email, options) {
      if (state.rateLimited) return { data: null, error: authError('over_email_send_rate_limit', 'Rate limit', 429) }
      state.emails.push({ type: 'reset', email, redirectTo: options?.redirectTo })
      return { data: {}, error: null }
    },
    async updateUser({ password }) {
      if (!state.session) return { data: { user: null }, error: authError('session_not_found', 'Auth session missing!') }
      if (password === 'weak-password') return { data: { user: null }, error: authError('weak_password', 'Password is too weak') }
      const user = state.users.find((candidate) => candidate.id === state.session.user.id)
      user.password = password
      emit('USER_UPDATED')
      return { data: { user: publicUser(user) }, error: null }
    },
  }

  const networkError = () => ({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' })
  const missingTable = () => ({ code: 'PGRST205', message: "Could not find the table 'public.plants' in the schema cache" })

  // A tiny query builder that behaves like the real one for what the app uses.
  function table() {
    const make = (operation, payload, options) => {
      const filters = []
      const query = {
        eq(column, value) { filters.push((row) => row[column] === value); return query },
        in(column, values) { filters.push((row) => values.includes(row[column])); return query },
        then(resolve, reject) { return run().then(resolve, reject) },
      }
      async function run() {
        state.calls.push([operation, payload?.length ?? null])
        if (operation === 'select' && state.selectDelay) await new Promise((resolve) => setTimeout(resolve, state.selectDelay))
        if (state.offline) return { data: null, error: networkError() }
        if (state.tableMissing) return { data: null, error: missingTable() }
        const owner = state.session?.user.id
        const writing = operation !== 'select'
        if (writing && state.failWrites > 0) {
          state.failWrites -= 1
          return { data: null, error: { code: 'XX000', message: 'Something broke' } }
        }
        if (operation === 'select') {
          // Row Level Security: only the signed-in person's own rows are ever visible.
          const data = state.rows.filter((row) => row.user_id === owner).filter((row) => filters.every((test) => test(row)))
          return { data: data.map((row) => ({ id: row.id, data: row.data })), error: null }
        }
        if (!owner) return { data: null, error: { code: '42501', message: 'permission denied for table plants', status: 401 } }
        if (operation === 'upsert') {
          for (const row of payload) {
            if (row.user_id !== owner) {
              return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }
            }
            const index = state.rows.findIndex((existing) => existing.user_id === row.user_id && existing.id === row.id)
            if (index >= 0) state.rows[index] = row
            else state.rows.push(row)
          }
          return { data: null, error: null }
        }
        state.rows = state.rows.filter((row) => !(row.user_id === owner && filters.every((test) => test(row))))
        return { data: null, error: null }
      }
      return query
    }
    return {
      select: () => make('select'),
      upsert: (rows, options) => make('upsert', rows, options),
      delete: () => make('delete'),
    }
  }

  const client = {
    auth,
    from: () => table(),
    async rpc(name) {
      state.calls.push(['rpc', name])
      if (state.offline) return { data: null, error: networkError() }
      if (state.rpcError) return { data: null, error: state.rpcError }
      if (name === 'delete_my_account' && state.session) {
        const id = state.session.user.id
        state.users = state.users.filter((user) => user.id !== id)
        state.rows = state.rows.filter((row) => row.user_id !== id)
        saveSession(null)
        return { data: null, error: null }
      }
      return { data: null, error: { code: 'P0001', message: 'Not signed in' } }
    },
  }

  reset()

  return {
    client,
    state,
    reset,
    addUser({ name = 'Test User', email, password, confirmed = true }) {
      const user = { id: crypto.randomUUID(), email, password, metadata: { name }, confirmed }
      state.users.push(user)
      return user
    },
    // Starts a session without going through the sign-in form.
    signInAs(user) {
      saveSession(sessionFor(user))
    },
    confirm(email) {
      state.users.find((user) => user.email === email).confirmed = true
    },
    // What opening the link in a password-reset email does.
    openRecoveryLink(email) {
      const user = state.users.find((candidate) => candidate.email === email)
      saveSession(sessionFor(user))
      emit('PASSWORD_RECOVERY')
    },
    rowsFor(userId) {
      return state.rows.filter((row) => row.user_id === userId)
    },
  }
}

export const fakeSupabase = createFake()
