type CacheEnvelope<T> = {
  ts: number
  lastAccess: number
  data: T
}

type CacheIndex = {
  meta: Record<string, { ts: number; lastAccess: number }>
}

const INDEX_KEY = "search_cache_index_v1"
const KEY_PREFIX = "search_cache_v1:"

let _lastNow = 0

function now() {
  const t = Date.now()
  if (t <= _lastNow) _lastNow = _lastNow + 1
  else _lastNow = t
  return _lastNow
}

function loadIndex(): CacheIndex {
  const raw = wx.getStorageSync(INDEX_KEY)
  if (raw && typeof raw === "object" && raw.meta && typeof raw.meta === "object") return raw as CacheIndex
  return { meta: {} }
}

function saveIndex(index: CacheIndex) {
  wx.setStorageSync(INDEX_KEY, index)
}

function hashString(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i)
  return (h >>> 0).toString(36)
}

export function makeSearchCacheKey(payload: any): string {
  const s = JSON.stringify(payload)
  return KEY_PREFIX + hashString(s)
}

export function getSearchCache<T>(key: string, ttlMs: number): T | null {
  if (ttlMs <= 0) {
    wx.removeStorageSync(key)
    const idx = loadIndex()
    delete idx.meta[key]
    saveIndex(idx)
    return null
  }
  const env = wx.getStorageSync(key) as CacheEnvelope<T> | undefined
  if (!env || typeof env !== "object") return null
  if (typeof env.ts !== "number" || typeof env.lastAccess !== "number") return null
  if (now() - env.ts > ttlMs) {
    wx.removeStorageSync(key)
    const idx = loadIndex()
    delete idx.meta[key]
    saveIndex(idx)
    return null
  }
  const idx = loadIndex()
  if (idx.meta[key]) {
    idx.meta[key].lastAccess = now()
    saveIndex(idx)
  }
  return env.data
}

export function setSearchCache<T>(key: string, data: T, maxEntries: number) {
  const ts = now()
  const env: CacheEnvelope<T> = { ts, lastAccess: ts, data }
  wx.setStorageSync(key, env)
  const idx = loadIndex()
  idx.meta[key] = { ts, lastAccess: ts }

  const keys = Object.keys(idx.meta)
  if (keys.length > maxEntries) {
    keys.sort((a, b) => idx.meta[a].lastAccess - idx.meta[b].lastAccess)
    const removeCount = keys.length - maxEntries
    for (let i = 0; i < removeCount; i++) {
      const k = keys[i]
      wx.removeStorageSync(k)
      delete idx.meta[k]
    }
  }
  saveIndex(idx)
}
