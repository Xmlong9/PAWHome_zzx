import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const projectRoot = path.resolve(__dirname, "..")
const appointmentTsPath = path.join(projectRoot, "pages", "vaccine", "appointment", "index.ts")

test("vaccine appointment: imports resolve to miniprogram root", () => {
  const content = fs.readFileSync(appointmentTsPath, "utf8")
  assert.doesNotMatch(content, /from\s+["']\.\.\/\.\.\/services\//)
  assert.match(content, /from\s+["']\.\.\/\.\.\/\.\.\/services\//)
})
