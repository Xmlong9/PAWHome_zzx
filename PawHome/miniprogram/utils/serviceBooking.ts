export type ServiceDateOption = {
  key: string
  label: string
  value: string
}

export type ServiceSuccessQueryInput = {
  type?: string
  appointmentId?: string
  petId?: string
  petName: string
  itemName: string
  storeName: string
  date: string
  time: string
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function utcDayTs(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

export function buildServiceDateOptions(availableDates: string[], now = new Date()): ServiceDateOption[] {
  const todayTs = utcDayTs(now)
  return availableDates
    .map((value) => {
      const current = parseYmd(value)
      if (!current) return null
      const diffDays = Math.round((utcDayTs(current) - todayTs) / (24 * 60 * 60 * 1000))
      if (diffDays < 0) return null
      let label = `${current.getMonth() + 1}/${current.getDate()}`
      if (diffDays === 0) label = "今天"
      if (diffDays === 1) label = "明天"
      if (diffDays === 2) label = "后天"
      return { key: value, label, value, _sort: utcDayTs(current) }
    })
    .filter((x): x is ServiceDateOption & { _sort: number } => Boolean(x))
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort: _ignored, ...rest }) => rest)
}

export function buildSuccessQuery(input: ServiceSuccessQueryInput): string {
  const params: Array<[string, string]> = [
    ["type", input.type || "vaccine"],
    ...(input.appointmentId ? [["appointmentId", input.appointmentId]] : []),
    ...(input.petId ? [["petId", input.petId]] : []),
    ["petName", input.petName],
    ["itemName", input.itemName],
    ["storeName", input.storeName],
    ["date", input.date],
    ["time", input.time]
  ]
  return `?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`
}

function parseYmd(value: string): Date | null {
  if (typeof value !== "string") return null
  const v = value.trim()
  const match = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return new Date(y, m - 1, d)
}
