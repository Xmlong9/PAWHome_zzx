// app.ts
import { code2Session, setToken, getToken } from "./services/auth";
import { getUserProfile } from "./services/user";
import { enterPageTransition, initPageTransition, reenterPageIfNeeded } from "./utils/transition";

const OriginalPage = Page

;(Page as any) = function (options: any) {
  const onLoad = options?.onLoad
  const onReady = options?.onReady
  const onShow = options?.onShow

  options.onLoad = function (...args: any[]) {
    initPageTransition(this)
    return typeof onLoad === "function" ? onLoad.apply(this, args) : undefined
  }

  options.onReady = function (...args: any[]) {
    const res = typeof onReady === "function" ? onReady.apply(this, args) : undefined
    enterPageTransition(this)
    return res
  }

  options.onShow = function (...args: any[]) {
    reenterPageIfNeeded(this)
    return typeof onShow === "function" ? onShow.apply(this, args) : undefined
  }

  return OriginalPage(options)
}

App<IAppOption>({
  globalData: {},
  onLaunch() {
    const token = getToken();
    if (token) return;
    wx.login({
      success: async r => {
        try {
          const data = await code2Session(r.code);
          setToken(data.token);
          try {
            const me = await getUserProfile()
            wx.setStorageSync("userId", me.id)
          } catch {
          }
        } catch (e) {
          wx.redirectTo({ url: "/pages/index/index" });
        }
      },
      fail: () => {
        wx.redirectTo({ url: "/pages/index/index" });
      }
    });
  },
})
