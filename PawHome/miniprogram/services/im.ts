import { request } from "./request"
import { MOCK_USERS } from "./user"
import { isMockEnabled } from "./mock"

export type IMConversation = {
  id: string
  peerId: string
  peerNickname: string
  peerAvatarUrl: string
  lastMessage: string
  lastMessageAt: number
  unreadCount: number
}

export type IMMessage = {
  id: string
  clientMsgId?: string
  conversationId: string
  senderId: string
  text: string
  createdAt: number
  status?: "pending" | "sent" | "failed"
}

// TODO: 后端上线后，把 MOCK 设为 false，并将下面的接口路径改为你们真实的后端路由。
const MOCK = () => isMockEnabled()

const STORAGE_CONVERSATIONS = "im_conversations"
const storageMessagesKey = (conversationId: string) => `im_messages_${conversationId}`

const now = () => Date.now()

const getSelfId = () => (wx.getStorageSync("userId") as string) || "me"

const readConversations = (): IMConversation[] => {
  const v = wx.getStorageSync(STORAGE_CONVERSATIONS)
  if (!v) return []
  try {
    return JSON.parse(v) as IMConversation[]
  } catch {
    return []
  }
}

const writeConversations = (list: IMConversation[]) => {
  wx.setStorageSync(STORAGE_CONVERSATIONS, JSON.stringify(list))
}

const readMessages = (conversationId: string): IMMessage[] => {
  const v = wx.getStorageSync(storageMessagesKey(conversationId))
  if (!v) return []
  try {
    return JSON.parse(v) as IMMessage[]
  } catch {
    return []
  }
}

const writeMessages = (conversationId: string, list: IMMessage[]) => {
  wx.setStorageSync(storageMessagesKey(conversationId), JSON.stringify(list))
}

const ensureSeed = () => {
  const convs = readConversations()
  if (convs.length > 0) return

  const seed: IMConversation[] = [
    {
      id: "c1",
      peerId: "u301",
      peerNickname: "好友A",
      peerAvatarUrl: "https://picsum.photos/seed/u301/100",
      lastMessage: "在吗？想问下你家猫粮是哪款",
      lastMessageAt: now() - 2 * 60 * 1000,
      unreadCount: 2
    },
    {
      id: "c2",
      peerId: "u302",
      peerNickname: "好友B",
      peerAvatarUrl: "https://picsum.photos/seed/u302/100",
      lastMessage: "哈哈哈太可爱了",
      lastMessageAt: now() - 24 * 60 * 60 * 1000,
      unreadCount: 0
    }
  ]
  writeConversations(seed)

  writeMessages("c1", [
    {
      id: "m1",
      conversationId: "c1",
      senderId: "u301",
      text: "你好～",
      createdAt: now() - 5 * 60 * 1000,
      status: "sent"
    },
    {
      id: "m2",
      conversationId: "c1",
      senderId: getSelfId(),
      text: "在的，有什么事吗？",
      createdAt: now() - 4 * 60 * 1000,
      status: "sent"
    },
    {
      id: "m3",
      conversationId: "c1",
      senderId: "u301",
      text: "想问下你家猫粮是哪款？",
      createdAt: now() - 2 * 60 * 1000,
      status: "sent"
    }
  ])

  writeMessages("c2", [
    {
      id: "m4",
      conversationId: "c2",
      senderId: "u302",
      text: "哈哈哈太可爱了",
      createdAt: now() - 24 * 60 * 60 * 1000,
      status: "sent"
    }
  ])
}

export const formatTime = (ts: number) => {
  const diff = Math.max(0, now() - ts)
  const min = Math.floor(diff / 60000)
  if (min < 1) return "刚刚"
  if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}天前`
  const date = new Date(ts)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

export const listConversations = async (): Promise<IMConversation[]> => {
  if (!MOCK()) {
    const res = await request<{ list: IMConversation[] }>({ url: "/im/conversations", method: "GET" })
    return res.list || []
  }
  ensureSeed()
  const list = readConversations()
  return list.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
}

export const createConversation = async (peerId: string): Promise<{ id: string }> => {
  if (!MOCK()) {
    return request<{ id: string }>({ url: "/im/conversations", method: "POST", data: { peerId } })
  }
  ensureSeed()
  const convs = readConversations()
  const existed = convs.find((c) => c.peerId === peerId)
  if (existed) return { id: existed.id }
  const id = `conv_mock_${peerId}`
  const user = MOCK_USERS[peerId]
  convs.push({
    id,
    peerId,
    peerNickname: user?.nickname || "未知用户",
    peerAvatarUrl: user?.avatarUrl || "https://picsum.photos/seed/peer/100",
    lastMessage: "",
    lastMessageAt: now(),
    unreadCount: 0
  })
  writeConversations(convs)
  return { id }
}

export const listMessages = async (conversationId: string): Promise<IMMessage[]> => {
  if (!MOCK()) {
    const res = await request<{ list: IMMessage[] }>({ url: "/im/messages", method: "GET", data: { conversationId } })
    return res.list || []
  }
  ensureSeed()
  return readMessages(conversationId).sort((a, b) => a.createdAt - b.createdAt)
}

export const markConversationRead = async (conversationId: string): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: `/im/conversations/${encodeURIComponent(conversationId)}/read`, method: "POST" })
    return
  }
  ensureSeed()
  const list = readConversations()
  const next = list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
  writeConversations(next)
}

export const sendTextMessage = async (params: {
  conversationId: string
  peerId: string
  text: string
  clientMsgId: string
}): Promise<IMMessage> => {
  if (!MOCK()) {
    const res = await request<IMMessage>({ url: "/im/messages", method: "POST", data: params })
    return res
  }

  ensureSeed()
  const selfId = getSelfId()
  const createdAt = now()

  const pending: IMMessage = {
    id: `local_${createdAt}`,
    clientMsgId: params.clientMsgId,
    conversationId: params.conversationId,
    senderId: selfId,
    text: params.text,
    createdAt,
    status: "sent"
  }

  const msgs = readMessages(params.conversationId)
  const nextMsgs = [...msgs, pending]
  writeMessages(params.conversationId, nextMsgs)

  const convs = readConversations()
  const idx = convs.findIndex((c) => c.id === params.conversationId)
  
  if (idx >= 0) {
    const c = convs[idx]
    convs[idx] = { ...c, lastMessage: params.text, lastMessageAt: createdAt }
  } else {
    // 如果没有找到现有会话（比如从主页第一次发起私信），就创建一个新的会话
    // 尝试从 mock 数据中找到对方的头像和昵称，如果没有则用默认值
    let peerNickname = "未知用户"
    let peerAvatarUrl = "https://picsum.photos/seed/peer/100"
    
    if (params.peerId && MOCK_USERS[params.peerId]) {
      peerNickname = MOCK_USERS[params.peerId].nickname
      peerAvatarUrl = MOCK_USERS[params.peerId].avatarUrl
    }
    
    convs.push({
      id: params.conversationId,
      peerId: params.peerId,
      peerNickname,
      peerAvatarUrl,
      lastMessage: params.text,
      lastMessageAt: createdAt,
      unreadCount: 0
    })
  }
  
  writeConversations(convs)

  return pending
}
