import { getBaseUrl } from "../../config/env"

function getApiOrigin(): string {
  const base = getBaseUrl()
  return base.split("/").slice(0, 3).join("/")
}

function cacheBustIfNotRelease(url: string): string {
  try {
    const v = wx.getAccountInfoSync().miniProgram.envVersion
    if (v === "release") return url
  } catch {}
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}t=${Date.now()}`
}

Page({
  data: {
    countdown: 3,
    timer: null as any,
    bgUrl: "",
    bgFallbackUsed: false
  },

  onLoad() {
    const url = `${getApiOrigin()}/media/splash-bg.png`
    this.setData({ bgUrl: cacheBustIfNotRelease(url) })
    this.startTimer();
  },

  onShow() {
  },

  onHide() {
    this.clearTimer();
  },

  onUnload() {
    this.clearTimer();
  },

  startTimer() {
    this.clearTimer();
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        this.clearTimer();
        this.goToLogin();
      } else {
        this.setData({ countdown: this.data.countdown - 1 });
      }
    }, 1000);
    this.setData({ timer });
  },

  clearTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  onSkip() {
    this.clearTimer();
    this.goToLogin();
  },

  onBgError() {
    if (this.data.bgFallbackUsed) return
    this.setData({ bgUrl: "/assets/images/home/slideshow1@1x.png", bgFallbackUsed: true })
  },

  goToLogin() {
    wx.redirectTo({
      url: '/pages/index/index'
    });
  }
});
