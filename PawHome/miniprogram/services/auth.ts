import { request } from "./request";
import { isAuthMockEnabled } from "./mock";

export function code2Session(code: string) {
  if (isAuthMockEnabled()) {
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
  if (isAuthMockEnabled()) {
    return Promise.resolve({ ok: true });
  }
  return request<{ ok: boolean }>({
    url: "/auth/sms/send",
    method: "POST",
    data: { phone }
  });
}

export function loginSms(phone: string, code: string) {
  if (isAuthMockEnabled()) {
    return Promise.resolve({ token: "mock-token-123456" });
  }
  return request<{ token: string }>({
    url: "/auth/login/sms",
    method: "POST",
    data: { phone, code }
  });
}

export function loginPassword(account: string, password: string) {
  if (isAuthMockEnabled()) {
    return Promise.resolve({ token: "mock-token-password" });
  }
  return request<{ token: string }>({
    url: "/auth/login/password",
    method: "POST",
    data: { account, password }
  });
}

export function registerUser(phone: string, password: string, nickname?: string) {
  if (isAuthMockEnabled()) {
    return Promise.resolve({ token: "mock-token-register" });
  }
  return request<{ token: string }>({
    url: "/auth/register",
    method: "POST",
    data: { phone, password, nickname }
  });
}

export function setToken(token: string) {
  wx.setStorageSync("token", token);
}

export function getToken(): string {
  return wx.getStorageSync("token");
}
