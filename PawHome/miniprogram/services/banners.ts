import { request } from "./request"
import type { BannerItem, CommunityCard } from "../types/banner"

export async function getBanners(slot: string): Promise<BannerItem[]> {
  const res = await request<{ list: BannerItem[] }>({ url: "/banners", method: "GET", data: { slot } })
  return res.list || []
}

export async function getCommunityCards(page = 1, pageSize = 5): Promise<CommunityCard[]> {
  const res = await request<{ list: CommunityCard[] }>({ url: "/feeds/community", method: "GET", data: { page, pageSize } })
  return res.list || []
}
