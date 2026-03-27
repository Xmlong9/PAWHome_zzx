export function isMockEnabled(): boolean {
  try {
    const v = wx.getStorageSync("MOCK")
    return v === true || v === "true" || v === 1 || v === "1"
  } catch {
    return false
  }
}

export function isAuthMockEnabled(): boolean {
  try {
    const v = wx.getStorageSync("MOCK_AUTH")
    return v === true || v === "true" || v === 1 || v === "1"
  } catch {
    return false
  }
}
