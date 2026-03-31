function defaultBaseUrl(): string {
  try {
    const sys = wx.getSystemInfoSync()
    if (sys?.platform === "devtools") return "http://127.0.0.1:5001/api/v1"
  } catch {
  }
  return "http://172.20.10.4:5001/api/v1"
}

export const DEFAULT_BASE_URL = defaultBaseUrl();

export function getBaseUrl(): string {
  try {
    const v = wx.getStorageSync("API_BASE_URL")
    if (typeof v === "string" && v.trim()) return v.trim()
  } catch {
  }
  return DEFAULT_BASE_URL
}

export const BASE_URL = getBaseUrl();
