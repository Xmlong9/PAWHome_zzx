// app.ts
import { code2Session, setToken, getToken } from "./services/auth";

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
        } catch (e) {
          wx.redirectTo({ url: "/pages/login/index" });
        }
      },
      fail: () => {
        wx.redirectTo({ url: "/pages/login/index" });
      }
    });
  },
})
