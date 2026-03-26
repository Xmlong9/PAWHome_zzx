import { getApiBaseUrl } from "../config/env";
import { getAccessToken } from "./session";
import { ApiEnvelope, ApiRequestError } from "./request";

export type UploadResult = {
  bucket: string;
  path: string;
  publicUrl: string;
};

function parseUploadResponse(raw: any): UploadResult {
  if (raw && typeof raw === "object" && typeof raw.publicUrl === "string") return raw as UploadResult;
  throw new Error("上传响应解析失败");
}

export async function uploadFile(params: {
  filePath: string;
  fileName?: string;
  bucket?: string;
  folder?: string;
}): Promise<UploadResult> {
  const token = getAccessToken();
  if (!token) throw new ApiRequestError("未登录", { statusCode: 401 });

  const url = `${getApiBaseUrl()}/uploads`;

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath: params.filePath,
      name: "file",
      formData: {
        bucket: params.bucket || "media",
        folder: params.folder || "uploads"
      },
      header: {
        Authorization: `Bearer ${token}`
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new ApiRequestError("上传失败", { statusCode: res.statusCode }));
          return;
        }
        try {
          const body = JSON.parse(res.data || "{}") as ApiEnvelope<any> | any;
          if (body && typeof body === "object" && typeof body.ok === "boolean") {
            if (body.ok) {
              resolve(parseUploadResponse(body.data));
              return;
            }
            reject(new ApiRequestError(body.error?.message || "上传失败", { statusCode: res.statusCode, apiError: body.error, requestId: body.request_id }));
            return;
          }
          resolve(parseUploadResponse(body));
        } catch (e) {
          reject(e);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

