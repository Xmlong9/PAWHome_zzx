import test from "node:test"
import assert from "node:assert/strict"

import { getLocalMediaFallback } from "./mediaCache"

test("media fallback: 商店媒体图缺失时回退到包内图片", () => {
  assert.equal(getLocalMediaFallback("http://127.0.0.1:5001/media/prod_01.jpg"), "/assets/images/shop/商品1.jpg")
  assert.equal(getLocalMediaFallback("/media/prod_05.jpg"), "/assets/images/shop/商品1.jpg")
})

test("media fallback: 首页和社区媒体图缺失时回退到包内占位图", () => {
  assert.equal(getLocalMediaFallback("http://127.0.0.1:5001/media/shop_banner.png"), "/assets/images/home/advertise@1x.png")
  assert.equal(getLocalMediaFallback("/media/%E6%8E%A8%E9%80%813.jpg"), "/assets/images/home/slideshow1@1x.png")
  assert.equal(getLocalMediaFallback("/media/some-post-cover.jpg"), "/assets/images/shop/问号猫.png")
})
