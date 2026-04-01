import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { inflateSync } from "node:zlib"

const projectRoot = process.cwd()
const appJsonPath = join(projectRoot, "miniprogram", "app.json")
const aiPageDir = join(projectRoot, "miniprogram", "pages", "ai")
const tabIconDir = join(projectRoot, "miniprogram", "assets", "icons", "tab")

function getPngSize(filePath: string): { width: number, height: number } {
  const buf = readFileSync(filePath)
  if (buf.length < 8) throw new Error("invalid png")
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!buf.subarray(0, 8).equals(sig)) throw new Error("invalid png signature")

  let off = 8
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString("ascii", off + 4, off + 8)
    const dataStart = off + 8
    const dataEnd = dataStart + len
    const crcEnd = dataEnd + 4
    if (crcEnd > buf.length) break
    const data = buf.subarray(dataStart, dataEnd)
    if (type === "IHDR") {
      return { width: data.readUInt32BE(0), height: data.readUInt32BE(4) }
    }
    off = crcEnd
  }
  throw new Error("missing IHDR")
}

function getPngAlphaAt(filePath: string, x: number, y: number): number {
  const buf = readFileSync(filePath)
  if (buf.length < 8) throw new Error("invalid png")
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!buf.subarray(0, 8).equals(sig)) throw new Error("invalid png signature")

  let off = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idatParts: Buffer[] = []

  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString("ascii", off + 4, off + 8)
    const dataStart = off + 8
    const dataEnd = dataStart + len
    const crcEnd = dataEnd + 4
    if (crcEnd > buf.length) break
    const data = buf.subarray(dataStart, dataEnd)

    if (type === "IHDR") {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data.readUInt8(8)
      colorType = data.readUInt8(9)
      interlace = data.readUInt8(12)
    } else if (type === "IDAT") {
      idatParts.push(data)
    } else if (type === "IEND") {
      break
    }

    off = crcEnd
  }

  if (!width || !height) throw new Error("missing IHDR")
  if (bitDepth !== 8 || interlace !== 0) throw new Error("unsupported png")
  if (colorType !== 6 && colorType !== 2) throw new Error("unsupported png")
  if (x < 0 || y < 0 || x >= width || y >= height) throw new Error("out of bounds")

  const inflated = inflateSync(Buffer.concat(idatParts))
  const bpp = colorType === 6 ? 4 : 3
  const stride = width * bpp
  const expected = height * (1 + stride)
  if (inflated.length < expected) throw new Error("corrupt png data")

  const out = Buffer.allocUnsafe(height * stride)
  let inOff = 0

  function paeth(a: number, b: number, c: number): number {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    if (pa <= pb && pa <= pc) return a
    if (pb <= pc) return b
    return c
  }

  for (let row = 0; row < height; row++) {
    const filter = inflated.readUInt8(inOff)
    inOff += 1
    const rowIn = inflated.subarray(inOff, inOff + stride)
    const rowOut = out.subarray(row * stride, (row + 1) * stride)

    if (filter === 0) {
      rowIn.copy(rowOut)
    } else if (filter === 1) {
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? rowOut[i - bpp] : 0
        rowOut[i] = (rowIn[i] + left) & 0xff
      }
    } else if (filter === 2) {
      const prev = row > 0 ? out.subarray((row - 1) * stride, row * stride) : null
      for (let i = 0; i < stride; i++) {
        const up = prev ? prev[i] : 0
        rowOut[i] = (rowIn[i] + up) & 0xff
      }
    } else if (filter === 3) {
      const prev = row > 0 ? out.subarray((row - 1) * stride, row * stride) : null
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? rowOut[i - bpp] : 0
        const up = prev ? prev[i] : 0
        rowOut[i] = (rowIn[i] + Math.floor((left + up) / 2)) & 0xff
      }
    } else if (filter === 4) {
      const prev = row > 0 ? out.subarray((row - 1) * stride, row * stride) : null
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? rowOut[i - bpp] : 0
        const up = prev ? prev[i] : 0
        const upLeft = prev && i >= bpp ? prev[i - bpp] : 0
        rowOut[i] = (rowIn[i] + paeth(left, up, upLeft)) & 0xff
      }
    } else {
      throw new Error(`unsupported filter ${filter}`)
    }

    inOff += stride
  }

  if (colorType === 2) return 255
  const idx = (y * width + x) * 4 + 3
  return out[idx] ?? 0
}

test("app.json: AI宠 入口注册在底部导航中间", () => {
  const appConfig = JSON.parse(readFileSync(appJsonPath, "utf8"))
  const pages = appConfig.pages as string[]
  const tabList = appConfig.tabBar?.list as Array<Record<string, string>>

  assert.ok(pages.includes("pages/ai/index"), "pages 中应注册 AI宠 页面")
  assert.equal(tabList.length, 5, "底部导航应扩展为 5 个入口")
  assert.deepEqual(tabList[2], {
    pagePath: "pages/ai/index",
    text: "AI宠",
    iconPath: "assets/icons/tab/ai-pet_notselect@1x.png",
    selectedIconPath: "assets/icons/tab/ai-pet@1x.png"
  }, "AI宠 应位于底部导航正中间")
})

test("AI宠 页面与图标资源存在", () => {
  const requiredFiles = [
    join(aiPageDir, "index.wxml"),
    join(aiPageDir, "index.wxss"),
    join(aiPageDir, "index.json"),
    join(aiPageDir, "index.ts"),
    join(tabIconDir, "ai-pet_notselect@1x.png"),
    join(tabIconDir, "ai-pet@1x.png")
  ]

  requiredFiles.forEach((filePath) => {
    assert.equal(existsSync(filePath), true, `${filePath} 应存在`)
  })
})

test("AI宠 图标资源应比普通占位更饱满，包含额外视觉层", () => {
  const selectedIconPath = join(tabIconDir, "ai-pet@1x.png")
  const unselectedIconPath = join(tabIconDir, "ai-pet_notselect@1x.png")
  const homeSelectedIconPath = join(tabIconDir, "home@1x.png")
  const homeUnselectedIconPath = join(tabIconDir, "home_notselect@1x.png")

  assert.ok(
    statSync(selectedIconPath).size > statSync(homeSelectedIconPath).size + 650,
    "选中态图标应明显大于普通 tab 图标，形成中心主入口感"
  )
  assert.ok(
    statSync(unselectedIconPath).size > statSync(homeUnselectedIconPath).size + 550,
    "未选中态图标也应保留明显底盘与更大的中心按钮体量"
  )
})

test("AI宠 图标不应包含底盘/光晕背景，四角应为不透明图像", () => {
  const selectedIconPath = join(tabIconDir, "ai-pet@1x.png")
  const unselectedIconPath = join(tabIconDir, "ai-pet_notselect@1x.png")

  const selectedSize = getPngSize(selectedIconPath)
  const unselectedSize = getPngSize(unselectedIconPath)
  const selectedPoints: Array<[number, number]> = [
    [0, 0],
    [selectedSize.width - 1, 0],
    [0, selectedSize.height - 1],
    [selectedSize.width - 1, selectedSize.height - 1]
  ]
  const unselectedPoints: Array<[number, number]> = [
    [0, 0],
    [unselectedSize.width - 1, 0],
    [0, unselectedSize.height - 1],
    [unselectedSize.width - 1, unselectedSize.height - 1]
  ]

  selectedPoints.forEach(([x, y]) => {
    assert.ok(getPngAlphaAt(selectedIconPath, x, y) >= 250, "选中态四角应为不透明图像")
  })
  unselectedPoints.forEach(([x, y]) => {
    assert.ok(getPngAlphaAt(unselectedIconPath, x, y) >= 250, "未选中态四角应为不透明图像")
  })
})
