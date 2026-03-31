import { getBaseUrl } from "../config/env";

type ApiOk<T> = { ok: true; message?: string; data?: T }
type ApiFail = { ok: false; error: { code: string; message: string; details?: unknown } }

export type RequestError = {
  statusCode?: number
  code?: string
  message: string
  details?: unknown
  raw?: unknown
  url?: string
}

function normalizeError(input: any): RequestError {
  const statusCode = input?.statusCode
  const raw = input?.data ?? input
  const apiError = input?.data?.error
  const message = apiError?.message || input?.errMsg || "请求失败"
  const url = typeof input?.url === "string" ? input.url : undefined
  return {
    statusCode: typeof statusCode === "number" ? statusCode : undefined,
    code: typeof apiError?.code === "string" ? apiError.code : undefined,
    message: String(message),
    details: apiError?.details,
    raw,
    url
  }
}

function getEnvVersion(): string | undefined {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion
  } catch {
    return undefined
  }
}

function getHostname(url: string): string | undefined {
  const m = url.match(/^https?:\/\/([^/]+)/i)
  if (!m) return undefined
  const host = m[1]
  const idx = host.indexOf(":")
  return idx >= 0 ? host.slice(0, idx) : host
}

function isPrivateHostname(hostname: string): boolean {
  if (hostname === "localhost") return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (hostname.startsWith("10.")) return true
    if (hostname.startsWith("127.")) return true
    if (hostname.startsWith("192.168.")) return true
    if (hostname.startsWith("172.")) {
      const p = hostname.split(".")
      const second = Number(p[1])
      if (Number.isFinite(second) && second >= 16 && second <= 31) return true
    }
  }
  return false
}

function shouldDowngradeHttps(message: string, url: string): boolean {
  if (!/^https:\/\//i.test(url)) return false
  const envVersion = getEnvVersion()
  if (envVersion === "release") return false
  const hostname = getHostname(url)
  if (!hostname || !isPrivateHostname(hostname)) return false
  return /ERR_SSL_PROTOCOL_ERROR/i.test(message) || /ssl/i.test(message)
}

export function request<T>(options: WechatMiniprogram.RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("token");
    const initialUrl = (options.url?.startsWith("http") ? options.url : getBaseUrl() + (options.url || ""))

    const doRequest = (url: string, isRetry: boolean) => {
      wx.request({
        ...options,
        url,
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
              const err = normalizeError({ statusCode: res.statusCode, data: body, url })
              console.error("API_ERROR", err)
              reject(err)
              return
            }

            resolve(res.data as T)
            return
          }

          const err = normalizeError({ ...res, url })
          console.error("HTTP_ERROR", err)
          reject(err)
        },
        fail(err) {
          const e = normalizeError({ ...err, url })
          if (!isRetry && shouldDowngradeHttps(e.message, url)) {
            doRequest(url.replace(/^https:\/\//i, "http://"), true)
            return
          }
          console.error("NETWORK_ERROR", e)
          reject(e);
        }
      });
    }

    doRequest(initialUrl, false)
  });
}
