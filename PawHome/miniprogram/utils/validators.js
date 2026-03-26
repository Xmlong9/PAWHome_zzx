function isPhone(v) {
  return /^1[3-9]\d{9}$/.test(String(v || ""))
}

module.exports = {
  isPhone
}
