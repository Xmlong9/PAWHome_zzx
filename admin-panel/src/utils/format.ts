export function formatDateTime(input?: string | null) {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatMoney(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return ''
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function statusText(map: Record<string, string>, key?: string | null) {
  if (!key) return ''
  return map[key] || key
}

export function normalizeMediaUrl(input?: string | null) {
  if (!input) return ''
  const url = String(input).trim()
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL || ''
  let origin = ''
  try {
    if (typeof base === 'string' && (base.startsWith('http://') || base.startsWith('https://'))) {
      origin = new URL(base).origin
    }
  } catch {}
  if (url.startsWith('/')) return origin ? `${origin}${url}` : url
  if (url.startsWith('media/')) return origin ? `${origin}/${url}` : `/${url}`
  return origin ? `${origin}/media/${url}` : `/media/${url}`
}
