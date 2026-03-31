import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const customerServiceChatWxmlPath = join(process.cwd(), "miniprogram", "pages", "shop", "customer-service-chat", "index.wxml")

test("customer service copy: 智能客服昵称展示为小宠", () => {
  const content = readFileSync(customerServiceChatWxmlPath, "utf8")

  assert.doesNotMatch(content, /小蜜/, "智能客服昵称不应继续显示为小蜜")
  assert.match(content, /小宠/, "智能客服昵称应显示为小宠")
})
