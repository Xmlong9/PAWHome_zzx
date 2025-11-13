import { BASE_URL } from "../config/env";

export function request<T>(options: WechatMiniprogram.RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("token");
    wx.request({
      ...options,
      url: (options.url?.startsWith("http") ? options.url : BASE_URL + (options.url || "")),
      header: {
        ...(options.header || {}),
        Authorization: token ? `Bearer ${token}` : ""
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          reject(res);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
