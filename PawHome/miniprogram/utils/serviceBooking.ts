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

export function buildServiceDateOptions(availableDates: string[], now = new Date()): ServiceDateOption[] {
  const todayTs = startOfDay(now)
  return availableDates.map((value) => {
    const current = parseYmd(value) || new Date(value)
    const diffDays = Math.round((startOfDay(current) - todayTs) / (24 * 60 * 60 * 1000))
    let label = `${current.getMonth() + 1}/${current.getDate()}`
    if (diffDays === 0) label = "今天"
    if (diffDays === 1) label = "明天"
    if (diffDays === 2) label = "后天"
    return { key: value, label, value }
  })
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
  const parts = value.split("-")
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return new Date(y, m - 1, d)
}
