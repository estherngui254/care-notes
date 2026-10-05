import { supabase } from './supabaseClient.js'

// Which shop items the shop has flagged as out of stock.
//
// The shop edits the shop_stock table in the Supabase dashboard (supabase/shop-stock.sql); the app
// only ever reads it. An item with no row there is in stock, so the table can stay empty until the
// shop has something to flag. Nothing here throws.

const SETUP = 'Stock information is not set up yet. The person running this app needs to run supabase/shop-stock.sql in the Supabase SQL Editor.'
const NETWORK = 'You are offline or the server could not be reached. Check your connection and try again.'

export function describeStockError(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (code === 'PGRST205' || code === '42P01' || code === '42883' || /could not find the (table|function)/i.test(message)) {
    return { kind: 'setup', text: SETUP }
  }
  if (code === '42501' || code === 'PGRST301' || error?.status === 401 || error?.status === 403 || /jwt|permission denied/i.test(message)) {
    return { kind: 'auth', text: 'Your sign-in has expired or is not allowed. Sign out and sign in again.' }
  }
  if (error?.name === 'TypeError' || error?.status === 0 || /failed to fetch|network|load failed/i.test(message)) {
    return { kind: 'network', text: NETWORK }
  }
  return { kind: 'other', text: 'Stock could not be checked just now. Please try again.' }
}

// The ids of the items that are out of stock, with the shop's note where it gave one.
export async function fetchOutOfStock() {
  try {
    const { data, error } = await supabase.from('shop_stock').select('item_id, note').eq('in_stock', false)
    if (error) return { error: describeStockError(error) }
    const outOfStock = new Map()
    for (const row of data ?? []) {
      outOfStock.set(row.item_id, typeof row.note === 'string' ? row.note : '')
    }
    return { outOfStock }
  } catch (error) {
    return { error: describeStockError(error) }
  }
}
