import { listFaqs } from "../../services/shop"
import { cleanupSupportConversations, listSupportConversations } from "../../services/support"

Page({
  data: {
    faqs: [] as Array<{ id: string; q: string; a: string }>,
    historyAll: [] as Array<{
      id: string
      title: string
      status: string
      time: string
      mode: "smart" | "human"
      startedAt: number
      lastAt: number
    }>,
    history: [] as Array<{
      id: string
      title: string
      status: string
      time: string
      mode: "smart" | "human"
      startedAt: number
      lastAt: number
    }>,
    showAllHistory: false
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
        startedAt: this.normalizeMs(c.createdAt),
        lastAt: this.normalizeMs(c.lastMessageAt || c.createdAt),
        time: this.formatTime(c.lastMessageAt || c.createdAt),
        mode: c.mode,
      }))
      this.setData({ historyAll: history })
      this.applyHistoryView()
    } catch {
      this.setData({ historyAll: [], history: [], showAllHistory: false })
    }
  },
  applyHistoryView() {
    const previewCount = 5
    const list = this.data.historyAll || []
    const showAll = !!this.data.showAllHistory
    this.setData({ history: showAll ? list : list.slice(0, previewCount) })
  },
  toggleHistory() {
    this.setData({ showAllHistory: !this.data.showAllHistory })
    this.applyHistoryView()
  },
  async cleanupHistory() {
    const keep = 5
    const total = (this.data.historyAll || []).length
    const res = await wx.showModal({
      title: "清理历史会话",
      content: `将清理已结束会话，仅保留最近 ${keep} 条（进行中的会话不会被删除）。当前历史：${total} 条。`,
      confirmText: "清理",
      cancelText: "取消"
    })
    if (!res.confirm) return
    try {
      const r = await cleanupSupportConversations(keep)
      wx.showToast({ title: `已清理 ${r.deletedConversations} 条`, icon: "none" })
      await this.loadHistory()
    } catch {
      wx.showToast({ title: "清理失败", icon: "none" })
    }
  },
  callNow() {
    wx.makePhoneCall({ phoneNumber: "4008888888" })
  },
  async toSmart() {
    wx.navigateTo({ url: "/pages/shop/customer-service-chat/index?mode=smart&forceNew=1" })
  },
  async toHuman() {
    wx.navigateTo({ url: "/pages/shop/customer-service-chat/index?mode=human&forceNew=1" })
  },
  tapFaq(e: WechatMiniprogram.TouchEvent) {
    const q = (e.currentTarget.dataset as any)?.q as string
    if (!q) return
    wx.navigateTo({ url: `/pages/shop/customer-service-chat/index?mode=smart&forceNew=1&prefill=${encodeURIComponent(q)}` })
  },
  openHistory(e: WechatMiniprogram.TouchEvent) {
    const { id, mode, startedAt } = e.currentTarget.dataset as { id: string; mode: "smart" | "human"; startedAt?: number }
    if (!id) return
    wx.navigateTo({
      url: `/pages/shop/customer-service-chat/index?mode=${mode}&conversationId=${encodeURIComponent(id)}${
        startedAt ? `&startedAt=${encodeURIComponent(String(startedAt))}` : ""
      }`
    })
  },
  normalizeMs(ts: number) {
    const n = Number(ts || 0)
    if (!n) return 0
    return n < 1e12 ? n * 1000 : n
  },
  formatTime(ts: number) {
    const date = new Date(this.normalizeMs(ts))
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
})
