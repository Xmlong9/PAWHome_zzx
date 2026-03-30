export type ServiceDateOption = {
  key: string
  label: string
  value: string
}

export type ServiceSuccessQueryInput = {
  type?: string
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
    const current = new Date(`${value}T00:00:00`)
    const diffDays = Math.round((startOfDay(current) - todayTs) / (24 * 60 * 60 * 1000))
    let label = `${current.getMonth() + 1}/${current.getDate()}`
    if (diffDays === 0) label = "今天"
    if (diffDays === 1) label = "明天"
    if (diffDays === 2) label = "后天"
    return { key: value, label, value }
  })
}

export function buildSuccessQuery(input: ServiceSuccessQueryInput): string {
  const params = [
    ["type", input.type || "vaccine"],
    ["petName", input.petName],
    ["itemName", input.itemName],
    ["storeName", input.storeName],
    ["date", input.date],
    ["time", input.time]
  ]
  return `?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`
}
