import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelOrder, fetchOrders, placeOrder } from './orders.js'
import { isActive } from './orderStatus.js'

const POLL_MS = 30_000

// One person's orders. While any order is still on its way, they are checked again every 30 seconds
// and whenever the tab is shown, so a change made by the shop appears without reloading the page.
//
// status: loading | ready | error | setup
export function useOrders(userId) {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [detail, setDetail] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [checkedAt, setCheckedAt] = useState(null)
  const alive = useRef(true)

  const load = useCallback(async () => {
    setRefreshing(true)
    const result = await fetchOrders(userId)
    if (!alive.current) return
    setRefreshing(false)
    if (result.error) {
      setDetail(result.error.text)
      setStatus(result.error.kind === 'setup' ? 'setup' : 'error')
      return
    }
    setOrders(result.orders)
    setDetail('')
    setStatus('ready')
    setCheckedAt(new Date())
  }, [userId])

  useEffect(() => {
    alive.current = true
    load()
    return () => { alive.current = false }
  }, [load])

  const anyActive = orders.some(isActive)

  useEffect(() => {
    if (!anyActive) return undefined
    const timer = setInterval(load, POLL_MS)
    const show = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', show)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', show)
    }
  }, [anyActive, load])

  const place = useCallback(async (order) => {
    const result = await placeOrder(order)
    if (result.order) setOrders((current) => [result.order, ...current.filter((existing) => existing.id !== result.order.id)])
    return result
  }, [])

  const cancel = useCallback(async (orderId) => {
    const result = await cancelOrder(orderId)
    if (result.order) await load()
    return result
  }, [load])

  return { orders, status, detail, refreshing, checkedAt, refresh: load, place, cancel }
}
