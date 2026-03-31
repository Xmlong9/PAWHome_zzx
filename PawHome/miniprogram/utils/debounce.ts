export function debounce<T extends (...args: any[]) => any>(fn: T, waitMs: number) {
  let t: any = null
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      t = null
      fn(...args)
    }, waitMs)
  }
}

