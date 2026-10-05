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
      orders: [], // rows of the orders table (snake_case, like the database)
      orderEvents: [],
      ordersMissing: false,
      messages: [], // rows of the messages table (a customer writes to the shop)
      feedback: [], // rows of the feedback table (review / complaint / compliment)
      news: [], // rows of the news table (updates posted by the shop)
      contactMissing: false,
      tick: 0,
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
  function table(name) {
    const make = (operation, payload, options) => {
      const filters = []
      let sortBy = null
      const query = {
        eq(column, value) { filters.push((row) => row[column] === value); return query },
        in(column, values) { filters.push((row) => values.includes(row[column])); return query },
        order(column, { ascending = true } = {}) { sortBy = { column, ascending }; return query },
        then(resolve, reject) { return run().then(resolve, reject) },
      }
      // The orders tables can only be read by a customer. Writes go through the two functions.
      function runOrders(owner) {
        const denied = { data: null, error: { code: '42501', message: `permission denied for table ${name}`, status: 401 } }
        if (operation !== 'select' || !owner) return denied
        const mine = new Set(state.orders.filter((order) => order.user_id === owner).map((order) => order.id))
        let data = name === 'orders'
          ? state.orders.filter((order) => order.user_id === owner)
          : state.orderEvents.filter((event) => mine.has(event.order_id))
        data = data.filter((row) => filters.every((test) => test(row)))
        if (sortBy) {
          const { column, ascending } = sortBy
          data = [...data].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1))
        }
        return { data: data.map((row) => structuredClone(row)), error: null }
      }
      // The contact tables, with the same rules as supabase/contact.sql: news is readable by
      // anyone signed in and written only by the dashboard; messages and feedback are read and
      // written only by the person they belong to.
      function runContact(operation, owner, payload, filters, sortBy) {
        const denied = { data: null, error: { code: '42501', message: `permission denied for table ${name}`, status: 401 } }
        const sorted = (rows) => {
          if (!sortBy) return rows
          const { column, ascending } = sortBy
          return [...rows].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1))
        }
        if (!owner) return denied
        if (name === 'news') {
          if (operation !== 'select') return denied
          const data = sorted(state.news.filter((row) => filters.every((test) => test(row))))
          return { data: data.map((row) => structuredClone(row)), error: null }
        }
        if (operation === 'select') {
          const mine = state[name].filter((row) => row.user_id === owner)
          const data = sorted(mine.filter((row) => filters.every((test) => test(row))))
          return { data: data.map((row) => structuredClone(row)), error: null }
        }
        if (operation === 'insert') {
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            const stored = { id: crypto.randomUUID(), created_at: now(), user_id: owner, ...row }
            if (stored.user_id !== owner) {
              return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }
            }
            state[name].push(stored)
          }
          return { data: null, error: null }
        }
        return denied
      }
      async function run() {
        state.calls.push([operation, payload?.length ?? null])
        if (operation === 'select' && state.selectDelay) await new Promise((resolve) => setTimeout(resolve, state.selectDelay))
        if (state.offline) return { data: null, error: networkError() }
        const ordersTable = name === 'orders' || name === 'order_events'
        const contactTable = name === 'news' || name === 'messages' || name === 'feedback'
        if (ordersTable && state.ordersMissing) {
          return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${name}' in the schema cache` } }
        }
        if (contactTable && state.contactMissing) {
          return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${name}' in the schema cache` } }
        }
        if (!ordersTable && !contactTable && state.tableMissing) return { data: null, error: missingTable() }
        if (ordersTable) return runOrders(state.session?.user.id)
        const owner = state.session?.user.id
        const writing = operation !== 'select'
        if (writing && state.failWrites > 0) {
          state.failWrites -= 1
          return { data: null, error: { code: 'XX000', message: 'Something broke' } }
        }
        if (contactTable) return runContact(operation, owner, payload, filters, sortBy)
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
      insert: (row) => make('insert', row),
      upsert: (rows, options) => make('upsert', rows, options),
      delete: () => make('delete'),
    }
  }

  // Time moves forward a second at a time, so history entries always sort in the order they happened.
  const now = () => new Date(Date.now() + (state.tick += 1) * 1000).toISOString()
  const raise = (message) => ({ data: null, error: { code: 'P0001', message } })
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  function logEvent(order, note) {
    state.orderEvents.push({ id: state.orderEvents.length + 1, order_id: order.id, status: order.status, note, created_at: now() })
  }

  // The same rules as place_order() in supabase/orders.sql (which is tested against a real Postgres).
  function placeOrder(owner, args) {
    if (!owner) return raise('Not signed in')
    const { p_items: items, p_fulfilment: fulfilment, p_customer: customer, p_address: address, p_payment: payment } = args
    let fee = args.p_delivery_fee ?? 0
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) return raise('Your basket is empty or too large')
    let subtotal = 0
    for (const item of items) {
      if (!item.id || !item.name) return raise('One of the items is not valid')
      if (!/^[0-9]{1,2}$/.test(String(item.qty ?? '')) || Number(item.qty) < 1) return raise('One of the quantities is not valid')
      if (!/^[0-9]{1,7}$/.test(String(item.priceKsh ?? ''))) return raise('One of the prices is not valid')
      subtotal += Number(item.qty) * Number(item.priceKsh)
    }
    if (!['delivery', 'collection'].includes(fulfilment)) return raise('Choose delivery or collection')
    if (!customer?.name || !customer?.phone) return raise('A name and phone number are required')
    if (fulfilment === 'delivery' && (!address?.area || !address?.street)) return raise('A delivery address is required')
    if (!['mpesa', 'cash'].includes(payment?.method)) return raise('Choose how you will pay')
    if (fee < 0 || fee > 10000) return raise('The delivery fee is not valid')
    if (fulfilment === 'collection') fee = 0
    if (state.orders.filter((order) => order.user_id === owner && order.status === 'placed').length >= 5) {
      return raise('You already have 5 orders waiting to be confirmed. Please wait for the shop to confirm them')
    }
    let code
    do {
      code = `PCN-${Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')}`
    } while (state.orders.some((order) => order.tracking_code === code))
    const stamp = now()
    const order = {
      id: crypto.randomUUID(), user_id: owner, tracking_code: code, status: 'placed', fulfilment, items,
      subtotal_ksh: subtotal, delivery_fee_ksh: fee, total_ksh: subtotal + fee, customer,
      address: fulfilment === 'delivery' ? address : null, payment, rider: null, eta: null, note: null,
      created_at: stamp, updated_at: stamp,
    }
    state.orders.push(order)
    logEvent(order, 'We received your order')
    return { data: structuredClone(order), error: null }
  }

  function cancelOrder(owner, id) {
    if (!owner) return raise('Not signed in')
    const order = state.orders.find((candidate) => candidate.id === id && candidate.user_id === owner)
    if (!order || !['placed', 'confirmed'].includes(order.status)) return raise('This order can no longer be cancelled. Please call the shop')
    order.status = 'cancelled'
    order.note = 'Cancelled by you'
    order.updated_at = now()
    logEvent(order, order.note)
    return { data: structuredClone(order), error: null }
  }

  const client = {
    auth,
    from: (name) => table(name),
    async rpc(name, args = {}) {
      state.calls.push(['rpc', name])
      if (state.offline) return { data: null, error: networkError() }
      if (state.rpcError) return { data: null, error: state.rpcError }
      const owner = state.session?.user.id
      if (name === 'place_order') {
        if (state.ordersMissing) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.place_order in the schema cache' } }
        return placeOrder(owner, args)
      }
      if (name === 'cancel_my_order') return cancelOrder(owner, args.p_order)
      if (name === 'delete_my_account' && state.session) {
        const id = state.session.user.id
        state.users = state.users.filter((user) => user.id !== id)
        state.rows = state.rows.filter((row) => row.user_id !== id)
        const gone = new Set(state.orders.filter((order) => order.user_id === id).map((order) => order.id))
        state.orders = state.orders.filter((order) => order.user_id !== id)
        state.orderEvents = state.orderEvents.filter((event) => !gone.has(event.order_id))
        state.messages = state.messages.filter((row) => row.user_id !== id)
        state.feedback = state.feedback.filter((row) => row.user_id !== id)
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
    ordersFor(userId) {
      return state.orders.filter((order) => order.user_id === userId)
    },
    // What the shop does in the Supabase dashboard: change an order, and the trigger writes the history.
    updateOrder(code, changes) {
      const order = state.orders.find((candidate) => candidate.tracking_code === code)
      const before = { status: order.status, note: order.note }
      Object.assign(order, changes)
      order.updated_at = now()
      if (order.status !== before.status || order.note !== before.note) logEvent(order, order.note)
      return order
    },
  }
}

export const fakeSupabase = createFake()
