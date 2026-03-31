import { getBaseUrl } from "../config/env"

type CacheRecord = {
  url: string
  path: string
  t: number
}

const MEM = new Map<string, string>()
const INFLIGHT = new Map<string, Promise<string>>()
const STORAGE_PREFIX = "paw_media_cache_v1_"

function apiOrigin(): string {
  const base = getBaseUrl()
  return base.split("/").slice(0, 3).join("/")
}

function normalizeBackendUrl(url: string): string {
  if (!url) return url
  if (/^data:/i.test(url)) return url
  if (/^wxfile:\/\//i.test(url)) return url
  if (url.startsWith("/assets/")) return url
  if (url.includes("__tmp__") && (url.includes("127.0.0.1") || url.includes("localhost"))) return url
  const origin = apiOrigin()
  if (url.startsWith("/")) return origin + url
  const m = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(\/.*)$/i)
  if (m) return origin + m[1]
  if (/^https?:\/\//i.test(url)) return url
  return origin + "/" + url
}

function isNetworkUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function isBypassUrl(url: string): boolean {
  if (!url) return true
  if (/^data:/i.test(url)) return true
  if (/^wxfile:\/\//i.test(url)) return true
  if (url.startsWith("/assets/")) return true
  if (url.includes("__tmp__") && (url.includes("127.0.0.1") || url.includes("localhost"))) return true
  return false
}

export function getLocalMediaFallback(src: string): string {
  if (typeof src !== "string" || !src.trim()) return ""
  const raw = src.trim()
  const normalized = normalizeBackendUrl(raw)
  const path = normalized.replace(/^https?:\/\/[^/]+/i, "")
  if (!path.startsWith("/media/")) return ""
  const name = decodeURIComponent(path.slice("/media/".length))
  if (/^prod_(\d+)\.jpg$/i.test(name)) {
    const matched = name.match(/^prod_(\d+)\.jpg$/i)
    const num = Number(matched?.[1] || 1)
    const fallbackIndex = ((Math.max(1, num) - 1) % 4) + 1
    return `/assets/images/shop/商品${fallbackIndex}.jpg`
  }
  if (name === "shop_banner.png") {
    return "/assets/images/home/advertise@1x.png"
  }
  if (/^推送[1-5]\.jpg$/i.test(name)) {
    return "/assets/images/home/slideshow1@1x.png"
  }
  return "/assets/images/shop/问号猫.png"
}

function hashKey(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

function storageKey(url: string): string {
  return STORAGE_PREFIX + hashKey(url)
}

function accessPath(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!path) return resolve(false)
    const fs = wx.getFileSystemManager()
    fs.access({
      path,
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

function saveTempFile(tempFilePath: string): Promise<string> {
  return new Promise((resolve) => {
    if (!tempFilePath) return resolve("")
    wx.saveFile({
      tempFilePath,
      success: (res) => resolve(res.savedFilePath || ""),
      fail: () => resolve("")
    })
  })
}

function downloadToTemp(url: string): Promise<{ ok: boolean; tempFilePath: string }> {
  return new Promise((resolve) => {
    const token = wx.getStorageSync("token")
    const origin = apiOrigin()
    const shouldAuth = typeof url === "string" && url.startsWith(origin)
    wx.downloadFile({
      url,
      header: shouldAuth && token ? { Authorization: `Bearer ${token}` } : undefined,
      success: (res) => {
        resolve({ ok: res.statusCode === 200, tempFilePath: res.tempFilePath || "" })
      },
      fail: () => resolve({ ok: false, tempFilePath: "" })
    })
  })
}

export async function resolveImageSrc(src: string): Promise<string> {
  if (typeof src !== "string" || !src.trim()) return src
  const raw = src.trim()
  if (/^wxfile:\/\//i.test(raw)) {
    const ok = await accessPath(raw)
    return ok ? raw : ""
  }
  const url = normalizeBackendUrl(raw)
  if (isBypassUrl(url)) return url
  if (!isNetworkUrl(url)) return url

  const hit = MEM.get(url)
  if (hit) return hit

  const key = storageKey(url)
  try {
    const cached = wx.getStorageSync(key) as CacheRecord | undefined
    if (cached && cached.url === url && typeof cached.path === "string" && cached.path) {
      const ok = await accessPath(cached.path)
      if (ok) {
        MEM.set(url, cached.path)
        return cached.path
      }
    }
  } catch {}

  const inflight = INFLIGHT.get(url)
  if (inflight) return inflight

  const p = (async () => {
    const dl = await downloadToTemp(url)
    if (!dl.ok || !dl.tempFilePath) return getLocalMediaFallback(url) || url
    const saved = await saveTempFile(dl.tempFilePath)
    const finalPath = saved || dl.tempFilePath
    MEM.set(url, finalPath)
    try {
      const rec: CacheRecord = { url, path: finalPath, t: Date.now() }
      wx.setStorageSync(key, rec)
    } catch {}
    return finalPath
  })()

  INFLIGHT.set(url, p)
  try {
    return await p
  } finally {
    INFLIGHT.delete(url)
  }
}

export async function resolveImageSrcList(srcList: string[]): Promise<string[]> {
  if (!Array.isArray(srcList) || srcList.length === 0) return Array.isArray(srcList) ? srcList : []
  const out = await Promise.all(srcList.map((x) => resolveImageSrc(String(x || ""))))
  return out
}

