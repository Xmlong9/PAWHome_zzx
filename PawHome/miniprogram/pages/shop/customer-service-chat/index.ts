import { listFaqs, listOrders, ShopOrder } from "../../../services/shop"
import { createSupportConversation, listSupportMessages, sendSupportMessage, sendSupportOrderCard, SupportMessage } from "../../../services/support"

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

type UiMessage = SupportMessage & { orderCard?: OrderCard }

Page({
  data: {
    mode: "smart" as "smart" | "human",
    conversationId: "",
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
      const mapped: UiMessage[] = list.map((m) => {
        if (m.type !== "order_card") return m as UiMessage
        try {
          const obj = JSON.parse(m.content || "{}") as any
          const createdAt = Number(obj.createdAt || 0)
          const orderCard: OrderCard = {
            orderId: String(obj.orderId || ""),
            amount: Number(obj.amount || 0),
            createdAt,
            displayTime: createdAt ? this.formatTime(createdAt) : "",
            productNames: Array.isArray(obj.productNames) ? obj.productNames.map((x: any) => String(x)) : [],
            items: Array.isArray(obj.items)
              ? obj.items.map((it: any) => ({ name: String(it.name || ""), count: Number(it.count || 0) }))
              : []
          }
          return { ...(m as UiMessage), orderCard }
        } catch {
          return m as UiMessage
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
    wx.redirectTo({
      url: '/pages/shop/customer-service-chat/index?mode=human'
    })
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
