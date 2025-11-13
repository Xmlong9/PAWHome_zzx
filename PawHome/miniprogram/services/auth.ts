import { request } from "./request";

export function code2Session(code: string) {
  return request<{ token: string; openid: string }>({
    url: "/auth/code2session",
    method: "POST",
    data: { code }
  });
}

export function sendSms(phone: string) {
  return request<{ ok: boolean }>({
    url: "/auth/sms/send",
    method: "POST",
    data: { phone }
  });
}

export function loginSms(phone: string, code: string) {
  return request<{ token: string }>({
    url: "/auth/login/sms",
    method: "POST",
    data: { phone, code }
  });
}

export function setToken(token: string) {
  wx.setStorageSync("token", token);
}

export function getToken(): string {
  return wx.getStorageSync("token");
}
