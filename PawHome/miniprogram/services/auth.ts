import { request } from "./request";
import { AuthSession, clearSession, getAccessToken, getSession, setSession } from "./session";

export async function register(email: string, password: string, nickname?: string): Promise<AuthSession | null> {
  const res = await request<{ session: AuthSession | null }>({
    url: "/auth/register",
    method: "POST",
    data: { email, password, nickname }
  });
  setSession(res.session);
  return res.session;
}

export async function login(email: string, password: string): Promise<AuthSession | null> {
  const res = await request<{ session: AuthSession | null }>({
    url: "/auth/login",
    method: "POST",
    data: { email, password }
  });
  setSession(res.session);
  return res.session;
}

export async function refresh(): Promise<AuthSession | null> {
  const current = getSession();
  if (!current?.refresh_token) return null;
  const res = await request<{ session: AuthSession | null }>({
    url: "/auth/refresh",
    method: "POST",
    data: { refresh_token: current.refresh_token },
    retryOnUnauthorized: false
  });
  setSession(res.session);
  return res.session;
}

export async function logout(): Promise<void> {
  try {
    await request<{ ok: boolean }>({ url: "/auth/logout", method: "POST", retryOnUnauthorized: false });
  } finally {
    clearSession();
  }
}

export function setToken(token: string) {
  const s = getSession();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const session: AuthSession = {
    access_token: token,
    refresh_token: s?.refresh_token || "",
    expires_at: s?.expires_at || nowSeconds + 3600,
    token_type: s?.token_type || "bearer",
    user: s?.user
  };
  setSession(session);
}

export function getToken(): string {
  return getAccessToken();
}
