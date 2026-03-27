// app.ts
import { code2Session, setToken, getToken } from "./services/auth";
import { getUserProfile } from "./services/user";

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
