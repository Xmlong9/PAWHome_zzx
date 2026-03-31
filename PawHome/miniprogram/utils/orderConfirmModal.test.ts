import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const orderListWxmlPath = join(process.cwd(), "miniprogram", "pages", "shop", "order", "list.wxml")
const orderListWxssPath = join(process.cwd(), "miniprogram", "pages", "shop", "order", "list.wxss")

test("订单确认收货弹层直接绑定面板显示态，避免只出现遮罩", () => {
  const wxml = readFileSync(orderListWxmlPath, "utf8")
  const wxss = readFileSync(orderListWxssPath, "utf8")

  assert.match(
    wxml,
    /\n<!-- 确认收货半屏弹窗 -->/,
    "确认收货弹层注释应与页面根容器同级，避免仍嵌套在 paw-route 内"
  )
  assert.match(
    wxml,
    /class="modal-content \{\{showConfirmModal \? 'show' : ''\}\}"/,
    "modal-content 应直接根据 showConfirmModal 切换 show 类"
  )
  assert.match(
    wxss,
    /\.modal-content\.show\s*\{/,
    "modal-content 应有独立的 show 样式规则"
  )
})
