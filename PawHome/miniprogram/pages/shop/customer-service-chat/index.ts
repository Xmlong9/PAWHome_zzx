import { listFaqs } from "../../../services/shop"
import { createSupportConversation, listSupportMessages, sendSupportMessage, SupportMessage } from "../../../services/support"

type Faq = { id: string; q: string; a: string }

const newId = () => `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`

Page({
  data: {
    mode: "smart" as "smart" | "human",
    conversationId: "",
    faqs: [] as Faq[],
    messages: [] as SupportMessage[],
    text: "",
    scrollTo: "bottom",
    statusBarHeight: 20,
    navBarHeight: 44
  },
  async onLoad(options: Record<string, string | undefined>) {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height

    this.setData({
      statusBarHeight,
      navBarHeight
    })

    const mode = (options.mode as any) === "human" ? "human" : "smart"
    const conversationId = options.conversationId || ""
    const prefill = options.prefill ? decodeURIComponent(options.prefill) : ""
    this.setData({ mode, conversationId })

    // 人工客服：此处仅负责发消息与展示历史消息；管理端后续通过写入 support_messages（sender_role=agent）实现回复

    try {
      const faqs = await listFaqs()
      this.setData({ faqs })
    } catch {
      this.setData({ faqs: [] })
    }

    if (conversationId) {
      await this.refreshMessages()
      return
    }

    try {
      const conv = await createSupportConversation(mode)
      this.setData({ conversationId: conv.id })
      await this.refreshMessages()
      if (prefill) {
        this.setData({ text: prefill })
        await this.send()
      }
      return
    } catch {
      wx.showToast({ title: "会话创建失败", icon: "none" })
    }
  },
  async refreshMessages() {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    try {
      const list = await listSupportMessages(conversationId)
      this.setData({ messages: list, scrollTo: "bottom" })
    } catch {
      wx.showToast({ title: "加载失败", icon: "none" })
    }
  },
  onInput(e: WechatMiniprogram.Input) {
    this.setData({ text: e.detail.value })
  },
  goBack() {
    wx.navigateBack({ delta: 1 }).catch(() => {
      wx.switchTab({ url: '/pages/shop/index' })
    })
  },
  async tapFaq(e: WechatMiniprogram.TouchEvent) {
    const q = (e.currentTarget.dataset as any)?.q as string
    if (!q) return
    this.setData({ text: q })
    await this.send()
  },
  async send() {
    const conversationId = this.data.conversationId
    const content = (this.data.text || "").trim()
    if (!conversationId) return
    if (!content) return

    const optimistic: SupportMessage = {
      id: newId(),
      role: "user",
      type: "text",
      content,
      createdAt: Date.now()
    }
    this.setData({ messages: [...this.data.messages, optimistic], text: "", scrollTo: `msg_${optimistic.id}` })

    try {
      await sendSupportMessage(conversationId, content)
      await this.refreshMessages()
    } catch {
      wx.showToast({ title: "发送失败", icon: "none" })
    }
  }
})
