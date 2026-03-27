import { refresh } from "./services/auth";
import { getSession, isSessionExpired } from "./services/session";

const PUBLIC_ROUTES = new Set<string>(["pages/splash/index", "pages/index/index", "pages/login/index", "pages/logs/logs"]);

function getCurrentRoute(): string {
  const pages = getCurrentPages();
  const last = pages[pages.length - 1] as any;
  return (last?.route || "") as string;
}

App<IAppOption>({
  globalData: {},
  async onLaunch() {
    const s = getSession();
    if (s && isSessionExpired(s)) {
      try {
        await refresh();
      } catch {
        return;
      }
    }
  },
  async onShow() {
    const route = getCurrentRoute();
    if (!route || PUBLIC_ROUTES.has(route)) return;

    const s = getSession();
    if (!s) {
      wx.reLaunch({ url: "/pages/index/index" });
      return;
    }

    if (isSessionExpired(s)) {
      try {
        await refresh();
      } catch {
        wx.reLaunch({ url: "/pages/index/index" });
      }
    }
  }
})
