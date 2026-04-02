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

