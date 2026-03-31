const REENTER_KEY = "paw_transition_reenter"
const ENTER_DURATION_MS = 300
const LEAVE_DURATION_MS = 240

let routingLocked = false

function getTopPage(): any | null {
  const pages = getCurrentPages()
  return pages && pages.length ? (pages[pages.length - 1] as any) : null
}

function nextFrame(fn: () => void) {
  if (typeof (wx as any).nextTick === "function") {
    ;(wx as any).nextTick(fn)
    return
  }
  setTimeout(fn, 16)
}

function safeSetData(page: any, data: Record<string, any>, cb?: () => void) {
  if (!page || typeof page.setData !== "function") return
  page.setData(data, cb)
}

export function initPageTransition(page: any) {
  safeSetData(page, { pageMounted: true, pageVisible: false, pageLeaving: false })
}

export function enterPageTransition(page: any) {
  safeSetData(page, { pageMounted: true, pageLeaving: false, pageVisible: false })
  nextFrame(() => safeSetData(page, { pageVisible: true }))
}

export function reenterPageIfNeeded(page: any) {
  const need = wx.getStorageSync(REENTER_KEY)
  if (need) {
    wx.removeStorageSync(REENTER_KEY)
    enterPageTransition(page)
    return
  }
  const d = page?.data
  if (d && d.pageMounted && (d.pageVisible === false || d.pageLeaving === true)) {
    enterPageTransition(page)
  }
}

export function navigateToWithTransition(url: string) {
  if (routingLocked) return
  routingLocked = true
  const page = getTopPage()
  if (!page || typeof page.setData !== "function") {
    wx.navigateTo({ url, complete: () => (routingLocked = false) })
    return
  }

  safeSetData(page, { pageLeaving: true, pageVisible: false }, () => {
    setTimeout(() => {
      wx.navigateTo({ url, complete: () => (routingLocked = false) })
    }, LEAVE_DURATION_MS)
  })
}

export function navigateToWithTransitionOptions(options: WechatMiniprogram.NavigateToOption) {
  const url = options?.url
  if (!url) return
  if (routingLocked) return
  routingLocked = true
  const page = getTopPage()
  const originalComplete = options.complete
  const next = () =>
    wx.navigateTo({
      ...options,
      complete: (res) => {
        routingLocked = false
        originalComplete?.(res)
      }
    })

  if (!page || typeof page.setData !== "function") {
    next()
    return
  }

  safeSetData(page, { pageLeaving: true, pageVisible: false }, () => {
    setTimeout(() => {
      next()
    }, LEAVE_DURATION_MS)
  })
}

export function navigateBackWithTransition(delta = 1) {
  if (routingLocked) return
  routingLocked = true
  const page = getTopPage()
  if (!page || typeof page.setData !== "function") {
    wx.navigateBack({ delta, complete: () => (routingLocked = false) })
    return
  }

  safeSetData(page, { pageLeaving: true, pageVisible: false }, () => {
    wx.setStorageSync(REENTER_KEY, Date.now())
    setTimeout(() => {
      wx.navigateBack({ delta, complete: () => (routingLocked = false) })
    }, LEAVE_DURATION_MS)
  })
}

export function navigateBackWithTransitionOptions(options: WechatMiniprogram.NavigateBackOption) {
  const delta = options?.delta ?? 1
  if (routingLocked) return
  routingLocked = true
  const page = getTopPage()
  const originalComplete = options.complete
  const next = () =>
    wx.navigateBack({
      ...options,
      delta,
      complete: (res) => {
        routingLocked = false
        originalComplete?.(res)
      }
    })

  if (!page || typeof page.setData !== "function") {
    next()
    return
  }

  safeSetData(page, { pageLeaving: true, pageVisible: false }, () => {
    wx.setStorageSync(REENTER_KEY, Date.now())
    setTimeout(() => {
      next()
    }, LEAVE_DURATION_MS)
  })
}

export const TRANSITION_MS = {
  enter: ENTER_DURATION_MS,
  leave: LEAVE_DURATION_MS
}
