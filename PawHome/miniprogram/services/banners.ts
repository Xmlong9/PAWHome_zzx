import { request } from "./request"
import type { BannerItem, CommunityCard } from "../types/banner"
import { getBaseUrl } from "../config/env"
import { resolveImageSrc } from "../utils/mediaCache"

function apiOrigin(): string {
  const base = getBaseUrl()
  return base.split("/").slice(0, 3).join("/")
}

function toAbsoluteUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:/i.test(url)) return url
  if (/^wxfile:\/\//i.test(url)) return url
  if (url.startsWith("/assets/")) return url
  const origin = apiOrigin()
  if (url.startsWith("/")) return origin + url
  return origin + "/" + url
}

export async function getBanners(slot: string): Promise<BannerItem[]> {
  const res = await request<{ list: BannerItem[] }>({ url: "/banners", method: "GET", data: { slot } })
  const list = (res.list || []).map((x) => ({ ...x, imageUrl: toAbsoluteUrl(x.imageUrl) }))
  const hydrated = await Promise.all(list.map(async (x) => ({ ...x, imageUrl: await resolveImageSrc(x.imageUrl) })))
  return hydrated
}

export async function getCommunityCards(page = 1, pageSize = 5): Promise<CommunityCard[]> {
  const res = await request<{ list: CommunityCard[] }>({ url: "/feeds/community", method: "GET", data: { page, pageSize, mode: "hot" } })
  const list = (res.list || []).map((x) => ({ ...x, imageUrl: toAbsoluteUrl(x.imageUrl) }))
  const hydrated = await Promise.all(list.map(async (x) => ({ ...x, imageUrl: await resolveImageSrc(x.imageUrl) })))
  return hydrated
}
