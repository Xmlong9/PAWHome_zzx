import { request } from "./request"

export type NotificationMsg = {
  id: string
  type: string
  actorId?: string | null
  avatarUrl: string
  nickname: string
  createdAt: number
  text: string
  content?: string | null
  commentText?: string | null
  postId?: string | null
  commentId?: string | null
  thumbUrl?: string | null
  isRead?: boolean
}

export async function listNotifications(
  type: "like" | "comment" | "favorite" | "follow",
  page = 1,
  pageSize = 20
): Promise<{ list: NotificationMsg[]; total: number }> {
  return request({ url: "/notifications", method: "GET", data: { type, page, pageSize } })
}

export async function getNotificationUnreadSummary(): Promise<{
  like: number
  favorite: number
  comment: number
  follow: number
  total: number
}> {
  return request({ url: "/notifications/unread-summary", method: "GET" })
}

export async function markNotificationsRead(payload: {
  type?: "like" | "comment" | "favorite" | "follow"
  ids?: string[]
}): Promise<{ updated: number }> {
  return request({ url: "/notifications/read", method: "PUT", data: payload || {} })
}
