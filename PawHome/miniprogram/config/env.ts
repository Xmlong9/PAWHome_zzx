type MiniProgramEnvVersion = "develop" | "trial" | "release";

const API_BASE_URL_BY_ENV: Record<MiniProgramEnvVersion, string> = {
  develop: "http://127.0.0.1:5001/api/v1",
  trial: "https://api.paw.example.com/api/v1",
  release: "https://api.paw.example.com/api/v1"
};

export function getApiBaseUrl(): string {
  try {
    const info = wx.getAccountInfoSync();
    const envVersion = (info?.miniProgram?.envVersion || "release") as MiniProgramEnvVersion;
    return API_BASE_URL_BY_ENV[envVersion] || API_BASE_URL_BY_ENV.release;
  } catch {
    return API_BASE_URL_BY_ENV.release;
  }
}

export const API_REQUEST_TIMEOUT_MS = 15000;
