import { request } from "./request";

const MOCK = true;

export function code2Session(code: string) {
  if (MOCK) {
    return Promise.resolve({
      token: "mock-token-123456",
      openid: "mock-openid-123456"
    });
  }
  return request<{ token: string; openid: string }>({
    url: "/auth/code2session",
    method: "POST",
    data: { code }
  });
}

export function sendSms(phone: string) {
  if (MOCK) {
    return Promise.resolve({ ok: true });
  }
  return request<{ ok: boolean }>({
    url: "/auth/sms/send",
    method: "POST",
    data: { phone }
  });
}

export function loginSms(phone: string, code: string) {
  if (MOCK) {
    return Promise.resolve({ token: "mock-token-123456" });
  }
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
