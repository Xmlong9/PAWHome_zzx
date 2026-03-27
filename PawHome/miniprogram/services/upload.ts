import { getBaseUrl } from "../config/env"

type UploadOk = { ok: true; data?: { url?: string } }

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
            resolve(url)
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

