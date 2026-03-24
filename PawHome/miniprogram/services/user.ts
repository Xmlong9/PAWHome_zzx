import { request } from "./request";

const MOCK = true;

export async function followUser(userId: number): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: `/users/${userId}/follow`, method: "POST" });
}

export async function unfollowUser(userId: number): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: `/users/${userId}/follow`, method: "DELETE" });
}
