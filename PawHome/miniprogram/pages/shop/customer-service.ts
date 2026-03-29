import { listFaqs } from "../../services/shop"
import { createSupportConversation, listSupportConversations, SupportConversation } from "../../services/support"

Page({
  data: {
    faqs: [] as Array<{ id: string; q: string; a: string }>,
    history: [] as Array<{ id: string; title: string; status: string; time: string; mode: "smart" | "human" }>
  },
  onShow() {
    this.loadFaqs()
    this.loadHistory()
  },
  async loadFaqs() {
    try {
      const faqs = await listFaqs()
      this.setData({ faqs })
    } catch {
      this.setData({ faqs: [] })
    }
  },
  async loadHistory() {
    try {
      const list = await listSupportConversations()
      const history = list.map((c) => ({
        id: c.id,
        title: c.mode === "human" ? "人工客服会话" : "智能客服会话",
        status: c.status === "open" ? "进行中" : "已结束",
        time: this.formatTime(c.lastMessageAt || c.createdAt),
        mode: c.mode
      }))
      this.setData({ history })
    } catch {
      this.setData({ history: [] })
    }
  },
  callNow() {
    wx.makePhoneCall({ phoneNumber: "4008888888" })
  },
  async toSmart() {
    try {
      const conv = await createSupportConversation("smart")
      wx.navigateTo({ url: `/pages/shop/customer-service-chat/index?mode=smart&conversationId=${encodeURIComponent(conv.id)}` })
    } catch {
      wx.showToast({ title: "进入失败", icon: "none" })
    }
  },
  async toHuman() {
    // 人工客服：回复由后续管理端写入 support_messages（sender_role=agent）实现
    try {
      const conv = await createSupportConversation("human")
      wx.navigateTo({ url: `/pages/shop/customer-service-chat/index?mode=human&conversationId=${encodeURIComponent(conv.id)}` })
    } catch {
      wx.showToast({ title: "进入失败", icon: "none" })
    }
  },
  tapFaq(e: WechatMiniprogram.TouchEvent) {
    const q = (e.currentTarget.dataset as any)?.q as string
    if (!q) return
    wx.navigateTo({ url: `/pages/shop/customer-service-chat/index?mode=smart&prefill=${encodeURIComponent(q)}` })
  },
  openHistory(e: WechatMiniprogram.TouchEvent) {
    const { id, mode } = e.currentTarget.dataset as { id: string; mode: "smart" | "human" }
    if (!id) return
    wx.navigateTo({ url: `/pages/shop/customer-service-chat/index?mode=${mode}&conversationId=${encodeURIComponent(id)}` })
  },
  formatTime(ts: number) {
    const date = new Date(ts)
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
})
