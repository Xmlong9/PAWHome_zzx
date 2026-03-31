import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const searchPagePath = join(process.cwd(), "miniprogram", "pages", "search", "index.ts")

test("search page: 商店搜索结果图片在渲染前走 resolveImageSrc", () => {
  const content = readFileSync(searchPagePath, "utf8")

  assert.match(
    content,
    /import\s+\{\s*resolveImageSrc\s*\}\s+from\s+"..\/..\/utils\/mediaCache"/,
    "搜索页应引入 resolveImageSrc 处理媒体图片"
  )
  assert.match(
    content,
    /const results = await Promise\.all\(res\.list\.map\(\(r\)\s*=>\s*this\.mapShopResult\(r,\s*kw\)\)\)/,
    "商店搜索结果应在 setData 前异步处理图片"
  )
  assert.match(
    content,
    /image:\s*await resolveImageSrc\(r\.image\)/,
    "商店搜索结果图片应经过 resolveImageSrc 兜底"
  )
})
