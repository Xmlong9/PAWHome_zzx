import test from "node:test"
import assert from "node:assert/strict"

import { debounce } from "./debounce"

test("debounce: only last call runs", async () => {
  let n = 0
  const fn = debounce(() => {
    n++
  }, 30)
  fn()
  fn()
  fn()
  await new Promise((r) => setTimeout(r, 80))
  assert.equal(n, 1)
})

