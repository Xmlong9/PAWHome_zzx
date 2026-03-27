import { getBaseUrl } from "../config/env"

type UploadOk = { ok: true; data?: { url?: string } }

function toAbsoluteUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:/i.test(url)) return url
  if (/^wxfile:\/\//i.test(url)) return url
  const base = getBaseUrl()
  const origin = base.split("/").slice(0, 3).join("/")
  if (url.startsWith("/")) return origin + url
  return origin + "/" + url
}

export function uploadFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("token")
    wx.uploadFile({
      url: `${getBaseUrl()}/uploads`,
      filePath,
      name: "file",
      header: {
        Authorization: token ? `Bearer ${token}` : ""
      },
      success(res) {
        try {
          const body = typeof res.data === "string" ? JSON.parse(res.data) : (res.data as any)
          const okBody = body as UploadOk
          const url = okBody?.data?.url
          if (okBody?.ok && typeof url === "string" && url) {
            resolve(toAbsoluteUrl(url))
            return
          }
          reject(body)
        } catch (e) {
          reject(e)
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}
