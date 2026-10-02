import { useCallback, useEffect, useRef, useState } from 'react'
import { changedPlants, clearPending, fetchCloudPlants, pushChanges, readPending, snapshot, writePending } from './cloudPlants.js'
import { readPlants, removePlants, writePlants } from './storage.js'

const SAVE_DELAY_MS = 300
const RETRY_MS = 15_000

// Keeps one person's plants in their Supabase account, with a copy on this device.
//
// - The device copy shows straight away and lets the app open offline.
// - The account is the source of truth: it is loaded on start and whenever the tab is shown again.
// - Changes are saved shortly after they are made. If that fails, they are remembered and tried
//   again, and they win over the account's copy the next time the app loads.
//
// status: loading | saved | saving | offline | setup | error
export function useCloudPlants(userId) {
  const scope = `cloud-${userId}`
  const [plants, setPlants] = useState(() => readPlants(scope))
  const [status, setStatus] = useState('loading')
  const [detail, setDetail] = useState('')

  const latest = useRef(plants)
  const initial = useRef(JSON.stringify(plants))
  const synced = useRef(new Map())
  const loaded = useRef(false)
  const pending = useRef(readPending(userId))
  const previousIds = useRef(new Set(plants.map((plant) => plant.id)))
  const saveTimer = useRef(null)
  const retryTimer = useRef(null)
  const running = useRef(null)
  latest.current = plants

  const remember = useCallback(() => writePending(userId, pending.current), [userId])

  const flush = useCallback(async () => {
    if (!loaded.current) return
    clearTimeout(saveTimer.current)
    clearTimeout(retryTimer.current)
    // One save at a time. A change made meanwhile is picked up by the loop below, and a second
    // caller simply waits for the save that is already running.
    if (running.current) return running.current
    let done
    running.current = new Promise((resolve) => { done = resolve })
    try {
      for (;;) {
        const upserts = changedPlants(synced.current, latest.current)
        const deletes = [...pending.current.deleted]
        if (upserts.length === 0 && deletes.length === 0) {
          pending.current = { dirty: false, deleted: new Set() }
          remember()
          setDetail('')
          setStatus('saved')
          return
        }
        setStatus('saving')
        const result = await pushChanges({ userId, upserts, deletes })
        if (result.error) {
          pending.current.dirty = true
          remember()
          setDetail(result.error.text)
          setStatus(result.error.kind === 'network' ? 'offline' : result.error.kind === 'setup' ? 'setup' : 'error')
          retryTimer.current = setTimeout(flush, RETRY_MS)
          return
        }
        for (const plant of upserts) synced.current.set(plant.id, JSON.stringify(plant))
        for (const id of deletes) {
          synced.current.delete(id)
          pending.current.deleted.delete(id)
        }
      }
    } finally {
      running.current = null
      done()
    }
  }, [remember, userId])

  // First load, and again whenever the tab is shown, so another device's changes appear.
  const load = useCallback(async (first) => {
    const result = await fetchCloudPlants(userId)
    if (result.error) {
      if (first) {
        loaded.current = true
        setDetail(result.error.text)
        setStatus(result.error.kind === 'network' ? 'offline' : result.error.kind === 'setup' ? 'setup' : 'error')
        retryTimer.current = setTimeout(flush, RETRY_MS)
      }
      return
    }
    const cloud = result.plants
    const unsaved = pending.current.dirty || pending.current.deleted.size > 0
    if (!first && unsaved) return
    synced.current = snapshot(cloud)
    let merged = cloud
    if (unsaved) {
      // Work done while offline wins over the account's copy.
      const byId = new Map(cloud.filter((plant) => !pending.current.deleted.has(plant.id)).map((plant) => [plant.id, plant]))
      for (const plant of latest.current) byId.set(plant.id, plant)
      merged = [...byId.values()]
    } else if (JSON.stringify([...snapshot(latest.current)].sort()) === JSON.stringify([...synced.current].sort())) {
      merged = latest.current
    }
    loaded.current = true
    if (merged !== latest.current) {
      latest.current = merged
      setPlants(merged)
    }
    previousIds.current = new Set(merged.map((plant) => plant.id))
    flush()
  }, [flush, userId])

  useEffect(() => {
    load(true)
    const show = () => { if (document.visibilityState === 'visible' && loaded.current) load(false) }
    const online = () => { if (loaded.current) flush() }
    document.addEventListener('visibilitychange', show)
    window.addEventListener('online', online)
    return () => {
      document.removeEventListener('visibilitychange', show)
      window.removeEventListener('online', online)
      clearTimeout(saveTimer.current)
      clearTimeout(retryTimer.current)
    }
  }, [load, flush])

  // Every change: keep the device copy, note deletions, and schedule a save.
  useEffect(() => {
    writePlants(plants, scope)
    const ids = new Set(plants.map((plant) => plant.id))
    for (const id of previousIds.current) if (!ids.has(id)) pending.current.deleted.add(id)
    for (const id of ids) pending.current.deleted.delete(id)
    previousIds.current = ids
    if (!loaded.current) {
      // A change made before the first load from the account finishes counts as unsaved work,
      // so the load keeps it instead of replacing it.
      if (JSON.stringify(plants) !== initial.current || pending.current.deleted.size > 0) {
        pending.current.dirty = true
        remember()
      }
      return
    }
    if (changedPlants(synced.current, plants).length > 0 || pending.current.deleted.size > 0) {
      pending.current.dirty = true
      remember()
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(flush, SAVE_DELAY_MS)
    }
  }, [plants, scope, flush, remember])

  // Saves anything waiting, then removes this device's copy if everything reached the account.
  const finish = useCallback(async () => {
    await flush()
    const unsaved = changedPlants(synced.current, latest.current).length > 0 || pending.current.deleted.size > 0
    if (!unsaved && loaded.current) {
      removePlants(scope)
      clearPending(userId)
    }
    return !unsaved
  }, [flush, scope, userId])

  const retry = useCallback(() => { flush() }, [flush])

  return { plants, setPlants, status, detail, retry, finish }
}
