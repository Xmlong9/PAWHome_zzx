import { getBaseUrl } from "../config/env";

type ApiOk<T> = { ok: true; message?: string; data?: T }
type ApiFail = { ok: false; error: { code: string; message: string; details?: unknown } }

export type RequestError = {
  statusCode?: number
  code?: string
  message: string
  details?: unknown
  raw?: unknown
}

function normalizeError(input: any): RequestError {
  const statusCode = input?.statusCode
  const raw = input?.data ?? input
  const apiError = input?.data?.error
  const message = apiError?.message || input?.errMsg || "请求失败"
  return {
    statusCode: typeof statusCode === "number" ? statusCode : undefined,
    code: typeof apiError?.code === "string" ? apiError.code : undefined,
    message: String(message),
    details: apiError?.details,
    raw
  }
}

export function request<T>(options: WechatMiniprogram.RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("token");
    wx.request({
      ...options,
      url: (options.url?.startsWith("http") ? options.url : getBaseUrl() + (options.url || "")),
      header: {
        ...(options.header || {}),
        Authorization: token ? `Bearer ${token}` : ""
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body: any = res.data
          if (body && typeof body === "object" && typeof body.ok === "boolean") {
            if (body.ok) {
              const okBody = body as ApiOk<T>
              resolve((okBody.data ?? (body as any)) as T)
              return
            }
            const err = normalizeError({ statusCode: res.statusCode, data: body })
            console.error("API_ERROR", err)
            reject(err)
            return
          }

          resolve(res.data as T)
          return
        }

        const err = normalizeError(res)
        console.error("HTTP_ERROR", err)
        reject(err)
      },
      fail(err) {
        const e = normalizeError(err)
        console.error("NETWORK_ERROR", e)
        reject(e);
      }
    });
  });
}
