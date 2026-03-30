export const DEFAULT_BASE_URL = "http://172.20.10.4:5001/api/v1";

export function getBaseUrl(): string {
  try {
    const v = wx.getStorageSync("API_BASE_URL")
    if (typeof v === "string" && v.trim()) return v.trim()
  } catch {
  }
  return DEFAULT_BASE_URL
}

export const BASE_URL = getBaseUrl();
