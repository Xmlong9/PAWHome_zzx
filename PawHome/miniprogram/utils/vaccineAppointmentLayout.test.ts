import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const projectRoot = path.resolve(__dirname, "..")
const appointmentWxmlPath = path.join(projectRoot, "pages", "vaccine", "appointment", "index.wxml")
const appointmentWxssPath = path.join(projectRoot, "pages", "vaccine", "appointment", "index.wxss")

test("vaccine appointment: 确认预约按钮位于页面底部且不固定遮挡内容", () => {
  const wxml = fs.readFileSync(appointmentWxmlPath, "utf8")
  const wxss = fs.readFileSync(appointmentWxssPath, "utf8")

  assert.match(wxml, /<view class="page-footer">\s*<view class="bottom-btn" bindtap="submit">/s)
  assert.doesNotMatch(wxml, /<view class="bottom-safe"><\/view>/)
  assert.match(wxss, /\.page-footer\s*\{[\s\S]*calc\(env\(safe-area-inset-bottom\)\s*\+\s*24rpx\)/s)
  assert.doesNotMatch(wxss, /\.bottom-btn\s*\{[\s\S]*position:\s*fixed;/s)
})
