import { request } from "./request"

type Post = {
  id: number
  userId: number
  user?: { id: number; nickname: string; avatarUrl: string }
  title?: string
  content: string
  petType?: string
  visibility?: string
  status?: string
  likeCount?: number
  commentCount?: number
  favoriteCount?: number
  createdAt?: string
  updatedAt?: string
}

const MOCK = true

export async function getPosts(page = 1, pageSize = 10): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  if (MOCK) {
    const list: Post[] = Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => ({
      id: i + 1 + (page - 1) * pageSize,
      userId: 100,
      user: { id: 100, nickname: "小爪", avatarUrl: "https://example.com/avt.png" },
      title: "今天的猫又翻箱倒柜了",
      content: "晒晒我家主子的日常，顺带问问大家猫砂推荐",
      petType: "cat",
      visibility: "public",
      status: "approved",
      likeCount: 12,
      commentCount: 3,
      favoriteCount: 1,
      createdAt: new Date().toISOString()
    }))
    return { list, page, pageSize, total: 20 }
  }
  const res = await request<{ list: Post[]; page: number; pageSize: number; total: number }>({ url: "/posts", method: "GET", data: { page, pageSize } })
  return res
}

export async function getMyPosts(page = 1, pageSize = 10): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  if (MOCK) {
    const list: Post[] = Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => ({
      id: i + 1 + (page - 1) * pageSize,
      userId: 200,
      user: { id: 200, nickname: "我", avatarUrl: "https://example.com/me.png" },
      title: "我的主子也来报到",
      content: "记录一次打疫苗的经历",
      petType: "dog",
      visibility: "public",
      status: "approved",
      likeCount: 5,
      commentCount: 2,
      favoriteCount: 0,
      createdAt: new Date().toISOString()
    }))
    return { list, page, pageSize, total: 8 }
  }
  const res = await request<{ list: Post[]; page: number; pageSize: number; total: number }>({ url: "/users/me/posts", method: "GET", data: { page, pageSize } })
  return res
}

export async function getPost(id: number): Promise<Post>{
  if (MOCK) {
    return {
      id,
      userId: 100,
      user: { id: 100, nickname: "小爪", avatarUrl: "https://example.com/avt.png" },
      title: "帖子详情",
      content: "这是一个详细的帖子内容，包含多张图片与视频",
      petType: "cat",
      visibility: "public",
      status: "approved",
      likeCount: 23,
      commentCount: 7,
      favoriteCount: 2,
      createdAt: new Date().toISOString()
    }
  }
  const res = await request<Post>({ url: `/posts/${id}`, method: "GET" })
  return res
}

export async function likePost(id: number): Promise<{ ok: boolean }>{
  if (MOCK) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${id}/like`, method: "POST" })
  return res
}

export async function unlikePost(id: number): Promise<{ ok: boolean }>{
  if (MOCK) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${id}/like`, method: "DELETE" })
  return res
}
