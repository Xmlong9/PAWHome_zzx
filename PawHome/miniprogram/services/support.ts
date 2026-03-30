import { request } from "./request"

export type SupportConversation = {
  id: string
  mode: "smart" | "human"
  status: "open" | "closed" | string
  createdAt: number
  lastMessageAt: number
}

export type SupportMessage = {
  id: string
  role: "user" | "bot" | "agent" | string
  type: "text" | "order_card" | string
  content: string
  createdAt: number
}

export const createSupportConversation = async (
  mode: "smart" | "human",
  opts?: { forceNew?: boolean }
): Promise<SupportConversation> => {
  return await request<SupportConversation>({
    url: "/shop/support/conversations",
    method: "POST",
    data: { mode, forceNew: !!opts?.forceNew }
  })
}

export const listSupportConversations = async (): Promise<SupportConversation[]> => {
  const res = await request<{ list: SupportConversation[] }>({ url: "/shop/support/conversations", method: "GET" })
  return res.list || []
}

export const closeSupportConversation = async (conversationId: string): Promise<SupportConversation> => {
  return await request<SupportConversation>({
    url: `/shop/support/conversations/${encodeURIComponent(conversationId)}/close`,
    method: "POST"
  })
}

export const cleanupSupportConversations = async (keep: number): Promise<{ deletedConversations: number; deletedMessages: number; kept: number }> => {
  return await request<{ deletedConversations: number; deletedMessages: number; kept: number }>({
    url: "/shop/support/conversations/cleanup",
    method: "POST",
    data: { keep }
  })
}

export const listSupportMessages = async (conversationId: string): Promise<SupportMessage[]> => {
  const res = await request<{ list: SupportMessage[] }>({
    url: `/shop/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    method: "GET"
  })
  return res.list || []
}

export const sendSupportMessage = async (conversationId: string, content: string): Promise<void> => {
  await request<void>({
    url: `/shop/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    method: "POST",
    data: { content }
  })
}

export const sendSupportOrderCard = async (conversationId: string, orderId: string): Promise<void> => {
  await request<void>({
    url: `/shop/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    method: "POST",
    data: { messageType: "order_card", orderId }
  })
}
