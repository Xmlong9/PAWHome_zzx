import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const projectRoot = path.resolve(__dirname, "..")
const appJsonPath = path.join(projectRoot, "app.json")
const homeTsPath = path.join(projectRoot, "pages", "home", "index.ts")

const vaccinePages = [
  "pages/vaccine/record/index",
  "pages/vaccine/import/index",
  "pages/vaccine/appointment/index",
  "pages/vaccine/reminder/index",
  "pages/vaccine/success/index"
]

test("vaccine navigation: 首页入口与疫苗页面路由保持一致", () => {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"))
  const homeTs = fs.readFileSync(homeTsPath, "utf8")

  assert.ok(Array.isArray(appJson.pages))
  vaccinePages.forEach((page) => {
    assert.ok(appJson.pages.includes(page), `缺少路由: ${page}`)
  })
  assert.match(
    homeTs,
    /goServiceVaccine\(\)\s*\{\s*wx\.navigateTo\(\{ url: ['"]\/pages\/vaccine\/record\/index['"] \}\);\s*\}/
  )
})
