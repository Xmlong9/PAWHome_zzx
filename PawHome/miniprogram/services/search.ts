import { request } from "./request"

export type SearchResult = {
  id: string
  title: string
  summary: string
  image: string
  likes?: number
  comments?: number
  price?: number
}

export async function searchCommunity(q: string, page = 1, pageSize = 10): Promise<{ list: SearchResult[]; total: number }> {
  return request({ url: "/search/posts", method: "GET", data: { q, page, pageSize } })
}

export async function searchShop(q: string, page = 1, pageSize = 10): Promise<{ list: SearchResult[]; total: number }> {
  return request({ url: "/search/products", method: "GET", data: { q, page, pageSize } })
}
