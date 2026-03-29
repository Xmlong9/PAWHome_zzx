import test from "node:test"
import assert from "node:assert/strict"

import { getSearchCache, makeSearchCacheKey, setSearchCache } from "./searchCache"

function makeWxStorage() {
  const m = new Map<string, any>()
  return {
    getStorageSync(key: string) {
      return m.get(key)
    },
    setStorageSync(key: string, value: any) {
      m.set(key, value)
    },
    removeStorageSync(key: string) {
      m.delete(key)
    }
  }
}

test("searchCache: set/get hit", () => {
  ;(globalThis as any).wx = makeWxStorage()
  const key = makeSearchCacheKey({ kind: "shop", kw: "猫砂", pageSize: 10 })
  setSearchCache(key, { list: [1], total: 1 }, 50)
  const v = getSearchCache<any>(key, 24 * 60 * 60 * 1000)
  assert.equal(v.total, 1)
  assert.deepEqual(v.list, [1])
})

test("searchCache: ttl expiry", async () => {
  ;(globalThis as any).wx = makeWxStorage()
  const key = makeSearchCacheKey({ kind: "shop", kw: "猫砂", pageSize: 10 })
  setSearchCache(key, { list: [1], total: 1 }, 50)
  const v1 = getSearchCache<any>(key, 0)
  assert.equal(v1, null)
})

test("searchCache: lru eviction", () => {
  ;(globalThis as any).wx = makeWxStorage()
  const k1 = makeSearchCacheKey({ kw: "a" })
  const k2 = makeSearchCacheKey({ kw: "b" })
  const k3 = makeSearchCacheKey({ kw: "c" })
  setSearchCache(k1, { v: 1 }, 2)
  setSearchCache(k2, { v: 2 }, 2)
  getSearchCache<any>(k1, 24 * 60 * 60 * 1000)
  setSearchCache(k3, { v: 3 }, 2)
  assert.equal(getSearchCache<any>(k2, 24 * 60 * 60 * 1000), null)
  assert.equal(getSearchCache<any>(k1, 24 * 60 * 60 * 1000)?.v, 1)
  assert.equal(getSearchCache<any>(k3, 24 * 60 * 60 * 1000)?.v, 3)
})

