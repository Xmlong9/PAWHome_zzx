const { listFaqs } = require("../../../services/shop")
const {
  createSupportConversation,
  listSupportMessages,
  sendSupportMessage
} = require("../../../services/support")

const newId = () => `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`

Page({
  data: {
    mode: "smart",
    conversationId: "",
    faqs: [],
    messages: [],
    text: "",
    scrollTo: "bottom"
  },
  async onLoad(options) {
    const mode = options && options.mode === "human" ? "human" : "smart"
    const conversationId = (options && options.conversationId) || ""
    const prefill = options && options.prefill ? decodeURIComponent(options.prefill) : ""
    this.setData({ mode, conversationId })

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
  onInput(e) {
    this.setData({ text: e.detail.value })
  },
  async tapFaq(e) {
    const q = (e.currentTarget.dataset || {}).q
    if (!q) return
    this.setData({ text: q })
    await this.send()
  },
  async send() {
    const conversationId = this.data.conversationId
    const content = (this.data.text || "").trim()
    if (!conversationId) return
    if (!content) return

    const optimistic = {
      id: newId(),
      role: "user",
      type: "text",
      content,
      createdAt: Date.now()
    }
    this.setData({
      messages: [...this.data.messages, optimistic],
      text: "",
      scrollTo: `msg_${optimistic.id}`
    })

    try {
      await sendSupportMessage(conversationId, content)
      await this.refreshMessages()
    } catch {
      wx.showToast({ title: "发送失败", icon: "none" })
    }
  }
})

