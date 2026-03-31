import test from "node:test"
import assert from "node:assert/strict"

import { reenterPageIfNeeded } from "./transition"

test("reenterPageIfNeeded: reenter flag triggers enter", () => {
  const store = new Map<string, any>()
  const key = "paw_transition_reenter"
  store.set(key, Date.now())

  ;(globalThis as any).wx = {
    getStorageSync: (k: string) => store.get(k),
    setStorageSync: (k: string, v: any) => store.set(k, v),
    removeStorageSync: (k: string) => store.delete(k),
    nextTick: (fn: () => void) => fn()
  }

  const page: any = {
    data: { pageMounted: true, pageVisible: true, pageLeaving: false },
    setData(obj: any, cb?: () => void) {
      this.data = { ...this.data, ...obj }
      cb?.()
    }
  }

  reenterPageIfNeeded(page)

  assert.equal(store.has(key), false)
  assert.equal(page.data.pageLeaving, false)
  assert.equal(page.data.pageVisible, true)
})

test("reenterPageIfNeeded: fallback reenters when page is invisible", () => {
  const store = new Map<string, any>()
  const key = "paw_transition_reenter"

  ;(globalThis as any).wx = {
    getStorageSync: (k: string) => store.get(k),
    setStorageSync: (k: string, v: any) => store.set(k, v),
    removeStorageSync: (k: string) => store.delete(k),
    nextTick: (fn: () => void) => fn()
  }

  const page: any = {
    data: { pageMounted: true, pageVisible: false, pageLeaving: true },
    setData(obj: any, cb?: () => void) {
      this.data = { ...this.data, ...obj }
      cb?.()
    }
  }

  reenterPageIfNeeded(page)

  assert.equal(store.has(key), false)
  assert.equal(page.data.pageLeaving, false)
  assert.equal(page.data.pageVisible, true)
})

test("reenterPageIfNeeded: does nothing when page is already visible", () => {
  const store = new Map<string, any>()

  ;(globalThis as any).wx = {
    getStorageSync: (k: string) => store.get(k),
    setStorageSync: (k: string, v: any) => store.set(k, v),
    removeStorageSync: (k: string) => store.delete(k),
    nextTick: (fn: () => void) => fn()
  }

  const page: any = {
    data: { pageMounted: true, pageVisible: true, pageLeaving: false },
    setData(obj: any, cb?: () => void) {
      this.data = { ...this.data, ...obj }
      cb?.()
    }
  }

  reenterPageIfNeeded(page)

  assert.equal(page.data.pageVisible, true)
  assert.equal(page.data.pageLeaving, false)
})

