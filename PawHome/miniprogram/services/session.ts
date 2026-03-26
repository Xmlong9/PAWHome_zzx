export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type?: string;
  user?: { id?: string; email?: string };
};

const STORAGE_KEY = "auth_session";

let refreshInFlight: Promise<AuthSession | null> | null = null;

export function getSession(): AuthSession | null {
  const v = wx.getStorageSync(STORAGE_KEY);
  if (!v) return null;
  return v as AuthSession;
}

export function setSession(session: AuthSession | null): void {
  if (!session) {
    wx.removeStorageSync(STORAGE_KEY);
    wx.removeStorageSync("token");
    wx.removeStorageSync("userId");
    return;
  }
  wx.setStorageSync(STORAGE_KEY, session);
  wx.setStorageSync("token", session.access_token);
  if (session.user?.id) {
    wx.setStorageSync("userId", session.user.id);
  }
}

export function clearSession(): void {
  setSession(null);
}

export function getAccessToken(): string {
  const s = getSession();
  return s?.access_token || "";
}

export function hasAccessToken(): boolean {
  return !!getAccessToken();
}

export function isSessionExpired(session: AuthSession, skewSeconds = 30): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return (session.expires_at || 0) <= nowSeconds + skewSeconds;
}

export async function ensureFreshSession(
  refreshFn: (refresh_token: string) => Promise<AuthSession | null>
): Promise<AuthSession | null> {
  const current = getSession();
  if (!current) return null;
  if (!isSessionExpired(current)) return current;
  if (!current.refresh_token) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const next = await refreshFn(current.refresh_token);
        if (next) setSession(next);
        else clearSession();
        return next;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}
