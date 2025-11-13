export function isPhone(v: string) {
  return /^1[3-9]\d{9}$/.test(v);
}
