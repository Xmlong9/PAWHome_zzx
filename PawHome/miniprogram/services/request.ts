import { API_REQUEST_TIMEOUT_MS, getApiBaseUrl } from "../config/env";
import { ensureFreshSession, getAccessToken, setSession } from "./session";

export type ApiError = {
  code: string;
  message: string;
  details?: any;
};

export type ApiEnvelope<T> =
  | { ok: true; data: T; error: null; request_id?: string }
  | { ok: false; data: null; error: ApiError; request_id?: string };

export class ApiRequestError extends Error {
  statusCode?: number;
  apiError?: ApiError;
  requestId?: string;

  constructor(message: string, opts?: { statusCode?: number; apiError?: ApiError; requestId?: string }) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = opts?.statusCode;
    this.apiError = opts?.apiError;
    this.requestId = opts?.requestId;
  }
}

function isApiEnvelope(value: any): value is ApiEnvelope<any> {
  return !!value && typeof value === "object" && typeof value.ok === "boolean" && "data" in value && "error" in value;
}

function buildUrl(url?: string): string {
  const base = getApiBaseUrl();
  const u = url || "";
  return u.startsWith("http") ? u : `${base}${u}`;
}

let lastAuthRedirectAt = 0;

function maybeRedirectToLogin(): void {
  const now = Date.now();
  if (now - lastAuthRedirectAt < 1500) return;
  lastAuthRedirectAt = now;
  try {
    const pages = getCurrentPages();
    const last = pages[pages.length - 1] as any;
    const route = (last?.route || "") as string;
    if (route === "pages/index/index" || route === "pages/login/index") return;
  } catch {
    return;
  }
  wx.reLaunch({ url: "/pages/index/index" });
}

function isProtectedApiPath(url?: string): boolean {
  const u = url || "";
  const path = u.startsWith("http")
    ? (() => {
        const i = u.indexOf("/api/");
        return i >= 0 ? u.slice(i) : u;
      })()
    : u;
  const p = path.split("?", 1)[0];
  return (
    p.startsWith("/shop/favorites") ||
    p.startsWith("/shop/orders") ||
    p.startsWith("/shop/cart") ||
    p.startsWith("/users/me") ||
    p.startsWith("/pets") ||
    p.startsWith("/service/appointments") ||
    p.startsWith("/uploads")
  );
}

function refreshSessionHttp(refresh_token: string): Promise<import("./session").AuthSession | null> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl("/auth/refresh"),
      method: "POST",
      timeout: API_REQUEST_TIMEOUT_MS,
      header: { "Content-Type": "application/json" },
      data: { refresh_token },
      success(res) {
        const data = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && isApiEnvelope(data) && data.ok) {
          resolve(data.data?.session || null);
          return;
        }
        resolve(null);
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

async function requestOnce(options: WechatMiniprogram.RequestOption): Promise<{ statusCode: number; body: any }> {
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      timeout: (options as any).timeout ?? API_REQUEST_TIMEOUT_MS,
      url: buildUrl(options.url),
      header: {
        ...(options.header || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        resolve({ statusCode: res.statusCode, body: res.data });
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

export async function request<T>(options: WechatMiniprogram.RequestOption & { retryOnUnauthorized?: boolean }): Promise<T> {
  const retryOnUnauthorized = options.retryOnUnauthorized !== false;

  if (!getAccessToken() && isProtectedApiPath(options.url)) {
    maybeRedirectToLogin();
    throw new ApiRequestError("缺少 Bearer Token", { statusCode: 401, apiError: { code: "unauthorized", message: "缺少 Bearer Token" } });
  }

  const { statusCode, body } = await requestOnce(options);
  if (statusCode === 401 && retryOnUnauthorized) {
    const next = await ensureFreshSession(refreshSessionHttp);
    if (next?.access_token) {
      const r2 = await requestOnce({ ...options, retryOnUnauthorized: false } as any);
      return unwrapOrThrow<T>(r2.statusCode, r2.body);
    }
  }

  return unwrapOrThrow<T>(statusCode, body);
}

function unwrapOrThrow<T>(statusCode: number, body: any): T {
  if (statusCode >= 200 && statusCode < 300) {
    if (isApiEnvelope(body)) {
      if (body.ok) return body.data as T;
      throw new ApiRequestError(body.error?.message || "请求失败", {
        statusCode,
        apiError: body.error || undefined,
        requestId: body.request_id
      });
    }
    return body as T;
  }

  if (isApiEnvelope(body) && !body.ok) {
    if (statusCode === 401) {
      setSession(null);
      maybeRedirectToLogin();
    }
    throw new ApiRequestError(body.error?.message || "请求失败", {
      statusCode,
      apiError: body.error || undefined,
      requestId: body.request_id
    });
  }

  if (statusCode === 401) {
    setSession(null);
    maybeRedirectToLogin();
  }
  throw new ApiRequestError("网络请求失败", { statusCode });
}
