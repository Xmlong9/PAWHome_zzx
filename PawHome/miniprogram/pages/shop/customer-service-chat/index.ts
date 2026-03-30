import { listFaqs, listOrders, ShopOrder } from "../../../services/shop"
import {
  closeSupportConversation,
  createSupportConversation,
  listSupportMessages,
  sendSupportMessage,
  sendSupportOrderCard,
  SupportMessage
} from "../../../services/support"

type Faq = { id: string; q: string; a: string }

const newId = () => `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`

type OrderCard = {
  orderId: string
  amount: number
  createdAt: number
  displayTime: string
  productNames: string[]
  items: Array<{ name: string; count: number }>
}

type UiMessage = SupportMessage & { orderCard?: OrderCard; displayTime?: string; showTime?: boolean }

Page({
  data: {
    mode: "smart" as "smart" | "human",
    conversationId: "",
    startedAt: 0,
    sessionDisplayTime: "",
    faqs: [] as Faq[],
    messages: [] as UiMessage[],
    text: "",
    scrollTo: "bottom",
    statusBarHeight: 20,
    navBarHeight: 44,
    showOrderSheet: false,
    recentOrders: [] as Array<ShopOrder & { displayTime: string; titleText: string }>,
    loadingOrders: false
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
    const forceNew = options.forceNew === "1" || options.forceNew === "true"
    const conversationId = forceNew ? "" : (options.conversationId || "")
    const prefill = options.prefill ? decodeURIComponent(options.prefill) : ""
    const startedAt = Number(options.startedAt || 0)
    this.setData({ mode, conversationId, startedAt, sessionDisplayTime: startedAt ? this.formatTimeFull(startedAt) : "" })

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
      const conv = await createSupportConversation(mode, { forceNew: true })
      this.setData({
        conversationId: conv.id,
        startedAt: Number(conv.createdAt || 0),
        sessionDisplayTime: conv.createdAt ? this.formatTimeFull(conv.createdAt) : ""
      })
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
  async onUnload() {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    try {
      await closeSupportConversation(conversationId)
    } catch {}
  },
  async refreshMessages() {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    try {
      const list = await listSupportMessages(conversationId)
      const threshold = 5 * 60 * 1000
      let prev = 0
      const mapped: UiMessage[] = list.map((m, idx) => {
        const createdAtMs = this.normalizeMs(m.createdAt)
        const showTime = idx === 0 || (createdAtMs && prev && createdAtMs - prev >= threshold)
        if (createdAtMs) prev = createdAtMs

        if (m.type !== "order_card") {
          return { ...(m as UiMessage), displayTime: createdAtMs ? this.formatTimeFull(createdAtMs) : "", showTime }
        }

        try {
          const obj = JSON.parse(m.content || "{}") as any
          const orderCreatedAt = this.normalizeMs(Number(obj.createdAt || 0))
          const orderCard: OrderCard = {
            orderId: String(obj.orderId || ""),
            amount: Number(obj.amount || 0),
            createdAt: orderCreatedAt,
            displayTime: orderCreatedAt ? this.formatTime(orderCreatedAt) : "",
            productNames: Array.isArray(obj.productNames) ? obj.productNames.map((x: any) => String(x)) : [],
            items: Array.isArray(obj.items)
              ? obj.items.map((it: any) => ({ name: String(it.name || ""), count: Number(it.count || 0) }))
              : []
          }
          return {
            ...(m as UiMessage),
            orderCard,
            displayTime: createdAtMs ? this.formatTimeFull(createdAtMs) : "",
            showTime
          }
        } catch {
          return { ...(m as UiMessage), displayTime: createdAtMs ? this.formatTimeFull(createdAtMs) : "", showTime }
        }
      })
      this.setData({ messages: mapped, scrollTo: "bottom" })
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
  switchToHuman() {
    wx.redirectTo({ url: "/pages/shop/customer-service-chat/index?mode=human&forceNew=1" })
  },
  async tapFaq(e: WechatMiniprogram.TouchEvent) {
    const q = (e.currentTarget.dataset as any)?.q as string
    if (!q) return
    this.setData({ text: q })
    await this.send()
  },
  sendOrder() {
    this.openOrderSheet()
  },
  formatTime(ts: number) {
    const date = new Date(ts)
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    return `${m}-${d} ${hh}:${mm}`
  },
  formatTimeFull(ts: number) {
    const date = new Date(ts)
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    return `${y}-${m}-${d} ${hh}:${mm}`
  },
  normalizeMs(ts: number) {
    const n = Number(ts || 0)
    if (!n) return 0
    return n < 1e12 ? n * 1000 : n
  },
  async openOrderSheet() {
    if (this.data.loadingOrders) return
    this.setData({ showOrderSheet: true, loadingOrders: true })
    try {
      const list = await listOrders("all")
      const recent = (list || [])
        .slice(0, 5)
        .map((o) => ({
          ...o,
          displayTime: this.formatTime(o.createdAt),
          titleText: (o.productNames && o.productNames.length ? o.productNames.slice(0, 2).join("、") : o.items?.[0]?.name || "订单") +
            (o.items && o.items.length > 2 ? ` 等${o.items.length}件` : "")
        }))
      this.setData({ recentOrders: recent })
    } catch {
      wx.showToast({ title: "订单加载失败", icon: "none" })
      this.setData({ recentOrders: [] })
    } finally {
      this.setData({ loadingOrders: false })
    }
  },
  closeOrderSheet() {
    this.setData({ showOrderSheet: false })
  },
  async chooseOrder(e: WechatMiniprogram.TouchEvent) {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    const orderId = String((e.currentTarget.dataset as any)?.id || "")
    const target = this.data.recentOrders.find((x) => x.id === orderId)
    if (!orderId || !target) return
    const snapshot: OrderCard = {
      orderId: target.id,
      amount: target.amount,
      createdAt: target.createdAt,
      displayTime: this.formatTime(target.createdAt),
      productNames: target.productNames || [],
      items: (target.items || []).slice(0, 5).map((it) => ({ name: it.name, count: it.count }))
    }
    const optimistic: UiMessage = {
      id: newId(),
      role: "user",
      type: "order_card",
      content: JSON.stringify(snapshot),
      createdAt: Date.now(),
      orderCard: snapshot
    }
    this.setData({
      messages: [...this.data.messages, optimistic],
      showOrderSheet: false,
      scrollTo: `msg_${optimistic.id}`
    })
    try {
      await sendSupportOrderCard(conversationId, orderId)
      await this.refreshMessages()
    } catch {
      wx.showToast({ title: "发送失败", icon: "none" })
    }
  },
  async send() {
    const conversationId = this.data.conversationId
    const content = (this.data.text || "").trim()
    if (!conversationId) return
    if (!content) return

    const optimistic: UiMessage = {
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
