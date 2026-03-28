export function trackEvent(event: string, payload: Record<string, string | number | boolean> = {}) {
  try {
    const data: Record<string, any> = {}
    Object.keys(payload).forEach((k) => {
      const v = payload[k]
      data[k] = typeof v === "boolean" ? (v ? 1 : 0) : v
    })
    if (typeof (wx as any).reportAnalytics === "function") {
      ;(wx as any).reportAnalytics(event, data)
    }
  } catch {
  }
}
