import { IMMessage, listMessages, markConversationRead, sendTextMessage } from "../../services/im"
import {
  enterPageTransition,
  initPageTransition,
  navigateBackWithTransition,
  reenterPageIfNeeded
} from "../../utils/transition"

type ChatMessage = IMMessage & { from: "me" | "them" }

const getSelfId = () => (wx.getStorageSync("userId") as string) || "me"

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    title: '私信',
    conversationId: '',
    peerId: '',
    peerAvatar: '',
    myAvatar: 'https://picsum.photos/seed/me/100',
    messages: [] as ChatMessage[],
    inputValue: '',
    canSend: false,
    keyboardHeight: 0,
    inputBarHeight: 0,
    scrollIntoView: 'bottom-anchor',

    pageMounted: false,
    pageVisible: false,
    pageLeaving: false
  },

  async onLoad(options: { id?: string; peerId?: string; nickname?: string; avatarUrl?: string }) {
    const sys = wx.getSystemInfoSync()
    const statusBarHeight = sys.statusBarHeight || 0
    const navHeight = statusBarHeight + 44

    // 优先使用传过来的 id 作为 conversationId，如果没有（比如从主页来）就生成一个与 peerId 强绑定的稳定 ID
    // 这样保证同一个 peerId 永远对应同一个本地 mock conversationId
    const peerId = options.peerId ? decodeURIComponent(options.peerId) : ''
    const conversationId = options.id || (peerId ? `conv_mock_${peerId}` : '')
    
    const title = options.nickname ? decodeURIComponent(options.nickname) : '私信'
    const peerAvatar = options.avatarUrl ? decodeURIComponent(options.avatarUrl) : 'https://picsum.photos/seed/peer/100'

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
    await this.loadMessages()
    if (conversationId) {
      await markConversationRead(conversationId)
    }
    this.scrollToBottom()
  },

  onReady() {
    enterPageTransition(this)
  },

  onShow() {
    reenterPageIfNeeded(this)
  },

  rpxToPx(rpx: number, sys: WechatMiniprogram.SystemInfo) {
    return Math.round((rpx * sys.screenWidth) / 750)
  },

  async loadMessages() {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    const selfId = getSelfId()
    const list = await listMessages(conversationId)
    const uiList: ChatMessage[] = list.map((m) => ({
      ...m,
      from: m.senderId === selfId ? "me" : "them"
    }))
    this.setData({ messages: uiList })
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

    const conversationId = this.data.conversationId
    const peerId = this.data.peerId
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
      from: "me"
    }

    this.setData({ messages: [...this.data.messages, optimistic], inputValue: '', canSend: false })
    this.scrollToBottom()

    try {
      const sent = await sendTextMessage({ conversationId, peerId, text, clientMsgId })
      const next = this.data.messages.map((m) =>
        m.clientMsgId && m.clientMsgId === clientMsgId
          ? { ...m, id: sent.id, createdAt: sent.createdAt, status: sent.status || "sent" }
          : m
      )
      this.setData({ messages: next })
    } catch {
      const next = this.data.messages.map((m) =>
        m.clientMsgId && m.clientMsgId === clientMsgId ? { ...m, status: "failed" } : m
      )
      this.setData({ messages: next })
      wx.showToast({ title: "发送失败", icon: "none" })
    }
  },

  scrollToBottom() {
    this.setData({ scrollIntoView: '' })
    this.setData({ scrollIntoView: 'bottom-anchor' })
  }
})
