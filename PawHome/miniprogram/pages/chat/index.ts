import { IMMessage, createConversation, listMessages, markConversationRead, sendTextMessage } from "../../services/im"
import { getUserProfile } from "../../services/user"
import { isMockEnabled } from "../../services/mock"
import {
  enterPageTransition,
  initPageTransition,
  navigateBackWithTransition,
  reenterPageIfNeeded
} from "../../utils/transition"

type ChatMessage = IMMessage & { from: "me" | "them"; renderKey: string }

const getSelfId = () => (wx.getStorageSync("userId") as string) || "me"
const POLL_INTERVAL_MS = 2000
const getToken = () => (wx.getStorageSync("token") as string) || ""
const PRIME_TEXT = "默认消息"

const waitForToken = async (timeoutMs = 2500) => {
  if (getToken()) return getToken()
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise<void>((resolve) => setTimeout(resolve, 80))
    const t = getToken()
    if (t) return t
  }
  return ""
}

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    title: '私信',
    conversationId: '',
    peerId: '',
    peerAvatar: '',
    myAvatar: '',
    messages: [] as ChatMessage[],
    inputValue: '',
    canSend: false,
    keyboardHeight: 0,
    inputBarHeight: 0,
    scrollTop: 0,

    pageMounted: false,
    pageVisible: false,
    pageLeaving: false
  },

  async ensureConversationId() {
    const anyThis = this as any
    const existed = this.data.conversationId
    if (existed) return existed
    const peerId = this.data.peerId
    if (!peerId) return ""
    if (anyThis._ensureConvPromise) return anyThis._ensureConvPromise as Promise<string>

    anyThis._ensureConvPromise = (async () => {
      const mock = isMockEnabled()
      if (!mock) {
        const token = await waitForToken()
        if (!token) return ""
      }

      try {
        const created = await createConversation(peerId)
        const id = (created as any)?.id || ""
        if (id) {
          if (!this.data.conversationId) this.setData({ conversationId: id })
          this.startPolling()
          return id
        }
      } catch {
      }

      if (mock) {
        const id = `conv_mock_${peerId}`
        if (!this.data.conversationId) this.setData({ conversationId: id })
        this.startPolling()
        return id
      }

      return ""
    })()
      .finally(() => {
        anyThis._ensureConvPromise = null
      }) as Promise<string>

    return anyThis._ensureConvPromise
  },

  async onLoad(options: { id?: string; peerId?: string; nickname?: string; avatarUrl?: string }) {
    const sys = wx.getSystemInfoSync()
    const statusBarHeight = sys.statusBarHeight || 0
    const navHeight = statusBarHeight + 44

    const peerId = options.peerId ? decodeURIComponent(options.peerId) : ''
    const conversationId = options.id || ''

    const title = options.nickname ? decodeURIComponent(options.nickname) : '私信'
    const peerAvatar = typeof options.avatarUrl === "string" ? decodeURIComponent(options.avatarUrl) : ""

    this.setData({
      statusBarHeight,
      navHeight,
      conversationId,
      peerId,
      title,
      peerAvatar,
      inputBarHeight: this.rpxToPx(104, sys)
    })

    initPageTransition(this)

    try {
      const me = await getUserProfile()
      if (me && (me as any).avatarUrl) {
        this.setData({ myAvatar: (me as any).avatarUrl })
      } else {
        this.setData({ myAvatar: "" })
      }
    } catch {
    }

    const ensured = await this.ensureConversationId()

    await this.loadMessages(ensured)
    if (ensured) {
      await markConversationRead(ensured)
    }
    this.scrollToBottom()
    this.startPolling()
  },

  onReady() {
    enterPageTransition(this)
  },

  onShow() {
    reenterPageIfNeeded(this)
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  rpxToPx(rpx: number, sys: WechatMiniprogram.SystemInfo) {
    return Math.round((rpx * sys.screenWidth) / 750)
  },

  async loadMessages(conversationId?: string) {
    const id = conversationId || this.data.conversationId
    if (!id) return
    const selfId = getSelfId()
    const list = await listMessages(id)
    const uiList: ChatMessage[] = list.map((m) => ({
        ...m,
        from: m.senderId === selfId ? "me" : "them",
        renderKey: m.id
      }))
    const next = this.mergeServerMessages(this.data.messages || [], uiList)
    this.setData({ messages: next })
  },

  mergeServerMessages(local: ChatMessage[], remote: ChatMessage[]) {
    const remoteByClientId = new Map<string, ChatMessage>()
    const remoteIds = new Set<string>()
    remote.forEach((m) => {
      if (m.clientMsgId) remoteByClientId.set(m.clientMsgId, m)
      remoteIds.add(m.id)
    })

    const pending = (local || []).filter((m) => m.status === "pending" || m.status === "failed")
    const keep = pending.filter((m) => {
      if (m.clientMsgId && remoteByClientId.has(m.clientMsgId)) return false
      if (remoteIds.has(m.id)) return false
      return true
    })
    const combined = [...remote, ...keep].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    return combined
  },

  startPolling() {
    const anyThis = this as any
    if (anyThis._pollTimer) return
    const conversationId = this.data.conversationId
    if (!conversationId) return
    anyThis._pollingStopped = false
    this.pollOnce()
  },

  stopPolling() {
    const anyThis = this as any
    anyThis._pollingStopped = true
    if (anyThis._pollTimer) {
      clearTimeout(anyThis._pollTimer)
      anyThis._pollTimer = null
    }
  },

  scheduleNextPoll() {
    const anyThis = this as any
    if (anyThis._pollingStopped) return
    if (anyThis._pollTimer) return
    anyThis._pollTimer = setTimeout(() => {
      anyThis._pollTimer = null
      this.pollOnce()
    }, POLL_INTERVAL_MS)
  },

  async pollOnce() {
    const anyThis = this as any
    if (anyThis._pollingStopped) return
    if (anyThis._pollingInFlight) return this.scheduleNextPoll()
    const conversationId = this.data.conversationId
    if (!conversationId) return

    anyThis._pollingInFlight = true
    try {
      const prev = this.data.messages || []
      const selfId = getSelfId()
      const list = await listMessages(conversationId)
      const remote: ChatMessage[] = list.map((m) => ({
          ...m,
          from: m.senderId === selfId ? "me" : "them",
          renderKey: m.id
        }))
      const merged = this.mergeServerMessages(prev, remote)

      let hasNewIncoming = false
      const lastSeenIncomingAt = (anyThis._lastSeenIncomingAt as number) || 0
      const nextLastIncomingAt = remote.reduce((max, m) => {
        if (m.senderId === selfId) return max
        return Math.max(max, m.createdAt || 0)
      }, lastSeenIncomingAt)
      if (nextLastIncomingAt > lastSeenIncomingAt) {
        hasNewIncoming = true
        anyThis._lastSeenIncomingAt = nextLastIncomingAt
      }

      const changed =
        merged.length !== prev.length ||
        merged.some(
          (m, i) =>
            prev[i]?.renderKey !== m.renderKey || prev[i]?.id !== m.id || prev[i]?.status !== m.status
        )
      if (changed) {
        this.setData({ messages: merged })
        this.scrollToBottom()
      }
      if (hasNewIncoming) {
        await markConversationRead(conversationId)
      }
    } catch {
    } finally {
      anyThis._pollingInFlight = false
      this.scheduleNextPoll()
    }
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      navigateBackWithTransition()
      return
    }
    wx.switchTab({ url: '/pages/community/index' })
  },

  onInput(e: WechatMiniprogram.Input) {
    const v = e.detail.value || ''
    this.setData({ inputValue: v, canSend: v.trim().length > 0 })
  },

  onFocus(e: WechatMiniprogram.InputFocus) {
    const h = (e.detail && (e.detail as any).height) || 0
    this.setData({ keyboardHeight: h })
    this.scrollToBottom()
  },

  onBlur() {
    this.setData({ keyboardHeight: 0 })
  },

  onSendTap() {
    this.sendMessage()
  },

  onSend() {
    this.sendMessage()
  },

  async sendMessage() {
    const text = (this.data.inputValue || '').trim()
    if (!text) return

    const peerId = this.data.peerId
    if (!peerId) {
      wx.showToast({ title: "对方信息缺失", icon: "none" })
      return
    }

    const mock = isMockEnabled()
    if (!mock) {
      const token = await waitForToken()
      if (!token) {
        wx.showToast({ title: "登录中，请稍后", icon: "none" })
        return
      }
    }

    const conversationId = await this.ensureConversationId()
    if (!conversationId) {
      wx.showToast({ title: "创建会话失败", icon: "none" })
      return
    }

    const anyThis = this as any
    if (!anyThis._primeDone) {
      try {
        const existed = await listMessages(conversationId)
        if ((existed || []).filter((m) => (m.text || "") !== PRIME_TEXT).length === 0) {
          await sendTextMessage({
            conversationId,
            peerId,
            text: PRIME_TEXT,
            clientMsgId: `prime_${Date.now()}`
          })
        }
      } catch {
      } finally {
        anyThis._primeDone = true
      }
    }

    const clientMsgId = `c_${Date.now()}`

    const selfId = getSelfId()
    const optimistic: ChatMessage = {
      id: clientMsgId,
      clientMsgId,
      conversationId,
      senderId: selfId,
      text,
      createdAt: Date.now(),
      status: "pending",
      from: "me",
      renderKey: clientMsgId
    }

    const optimisticMessages = [...(this.data.messages || []), optimistic]
    this.setData({ messages: optimisticMessages, inputValue: '', canSend: false })
    this.scrollToBottom()

    try {
      const sent = await sendTextMessage({ conversationId, peerId, text, clientMsgId })
      const updated = optimisticMessages.map((m) =>
        m.clientMsgId && m.clientMsgId === clientMsgId
          ? { ...m, id: sent.id, createdAt: sent.createdAt, status: sent.status || "sent" }
          : m
      )
      this.setData({ messages: updated })
      await this.loadMessages(conversationId)
      this.scrollToBottom()
    } catch {
      const next = (this.data.messages || optimisticMessages).map((m) =>
        m.clientMsgId && m.clientMsgId === clientMsgId ? { ...m, status: "failed" } : m
      )
      this.setData({ messages: next })
      wx.showToast({ title: "发送失败", icon: "none" })
    }
  },

  scrollToBottom() {
    const next = this.data.scrollTop === 999999999 ? 999999998 : 999999999
    this.setData({ scrollTop: next })
  }
})
