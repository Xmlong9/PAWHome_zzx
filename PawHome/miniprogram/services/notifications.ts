import { request } from "./request"

export type NotificationMsg = {
  id: string
  type: string
  avatarUrl: string
  nickname: string
  createdAt: number
  text: string
  content?: string | null
  postId?: string | null
  thumbUrl?: string | null
  isRead?: boolean
}

export async function listNotifications(
  type: "like" | "comment" | "favorite",
  page = 1,
  pageSize = 20
): Promise<{ list: NotificationMsg[]; total: number }> {
  return request({ url: "/notifications", method: "GET", data: { type, page, pageSize } })
}
