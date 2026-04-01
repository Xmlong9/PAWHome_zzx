import { listFaqs, listOrders, ShopOrder } from "../../../services/shop"
import {
  closeSupportConversation,
  createSupportConversation,
  listSupportMessages,
  sendSupportMessage,
  sendSupportOrderCard,
  SupportMessage
} from "../../../services/support"
import { navigateBackWithTransition } from "../../../utils/transition"

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

type UiMessage = SupportMessage & { orderCard?: OrderCard; displayTime?: string; showTime?: boolean; isTyping?: boolean; displayContent?: string; isAnimating?: boolean }

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
    orderSheetVisible: false,
    recentOrders: [] as Array<ShopOrder & { displayTime: string; titleText: string }>,
    loadingOrders: false,
    isWaitingResponse: false
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
  async refreshMessages(animateNewBot = false) {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    try {
      const list = await listSupportMessages(conversationId)
      const threshold = 5 * 60 * 1000
      let prev = 0

      const set = ((this as any).animatedMessageIds = (this as any).animatedMessageIds || new Set<string>())
      let animateTargetId = ""

      const mapped: UiMessage[] = list.map((m, idx) => {
        const createdAtMs = this.normalizeMs(m.createdAt)
        const showTime = idx === 0 || (createdAtMs && prev && createdAtMs - prev >= threshold)
        if (createdAtMs) prev = createdAtMs

        let isAnimating = false
        let displayContent = m.content

        if (m.type !== "order_card") {
          if (animateNewBot && idx === list.length - 1 && m.role === "bot" && !set.has(m.id)) {
            set.add(m.id)
            animateTargetId = m.id
            isAnimating = true
            displayContent = ""
          } else {
            const oldMsg = this.data.messages.find((old) => old.id === m.id)
            if (oldMsg && oldMsg.isAnimating) {
              isAnimating = true
              displayContent = oldMsg.displayContent || ""
            } else if (set.has(m.id)) {
              isAnimating = false
            }
          }
          return { ...(m as UiMessage), displayTime: createdAtMs ? this.formatTimeFull(createdAtMs) : "", showTime, isAnimating, displayContent }
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
            showTime,
            isAnimating: false,
            displayContent: ""
          }
        } catch {
          return { ...(m as UiMessage), displayTime: createdAtMs ? this.formatTimeFull(createdAtMs) : "", showTime, isAnimating: false, displayContent: "" }
        }
      })
      this.setData({ messages: mapped, scrollTo: "bottom" })

      if (animateTargetId) {
        const targetMsg = mapped.find((m) => m.id === animateTargetId)
        if (targetMsg) {
          this.startTypewriter(targetMsg.id, targetMsg.content)
        }
      }
    } catch {
      wx.showToast({ title: "加载失败", icon: "none" })
    }
  },
  startTypewriter(id: string, fullText: string) {
    let currentLen = 0
    const step = () => {
      const target = this.data.messages.find((m) => m.id === id)
      if (!target || !target.isAnimating) return

      currentLen += 2
      if (currentLen > fullText.length) currentLen = fullText.length

      const msgs = this.data.messages.map((m) => {
        if (m.id === id) {
          return { ...m, displayContent: fullText.substring(0, currentLen), isAnimating: currentLen < fullText.length }
        }
        return m
      })

      this.setData({ messages: msgs, scrollTo: `msg_${id}` })

      if (currentLen < fullText.length) {
        setTimeout(step, 30)
      }
    }
    step()
  },
  onInput(e: WechatMiniprogram.Input) {
    this.setData({ text: e.detail.value })
  },
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      navigateBackWithTransition()
      return
    }
    wx.switchTab({ url: "/pages/shop/index" })
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
    this.setData({ showOrderSheet: true, orderSheetVisible: false, loadingOrders: true })
    setTimeout(() => {
      this.setData({ orderSheetVisible: true })
    }, 20)
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
    if (!this.data.showOrderSheet) return
    this.setData({ orderSheetVisible: false })
    setTimeout(() => {
      this.setData({ showOrderSheet: false })
    }, 240)
  },
  async chooseOrder(e: WechatMiniprogram.TouchEvent) {
    const conversationId = this.data.conversationId
    if (!conversationId) return
    const orderId = String((e.currentTarget.dataset as any)?.id || "")
    const target = this.data.recentOrders.find((x) => x.id === orderId)
    if (!orderId || !target) return
    const tempId = `m_temp_${Date.now()}`
    const order = this.data.recentOrders.find((o) => o.id === orderId)
    const tempMsg: UiMessage = {
      id: tempId,
      role: "user",
      type: "order_card",
      content: "",
      createdAt: Date.now(),
      displayTime: "",
      showTime: false,
      orderCard: order
        ? {
            orderId: order.id,
            amount: order.totalCents / 100,
            createdAt: this.normalizeMs(order.createdAt),
            displayTime: order.displayTime,
            productNames: [],
            items: (order.items || []).slice(0, 5).map((it) => ({ name: it.title || "", count: it.quantity || 1 }))
          }
        : undefined
    }

    const typingMsg: UiMessage = {
      id: "typing_indicator",
      role: "bot",
      type: "text",
      content: "",
      createdAt: Date.now(),
      displayTime: "",
      showTime: false,
      isTyping: true
    }

    this.closeOrderSheet()
    this.setData({
      messages: [...this.data.messages, tempMsg, typingMsg],
      scrollTo: "typing_indicator",
      isWaitingResponse: true
    })
    try {
      await sendSupportOrderCard(conversationId, orderId)
      await this.refreshMessages(true)
    } catch {
      wx.showToast({ title: "发送失败", icon: "none" })
      this.setData({
        messages: this.data.messages.filter((m) => m.id !== tempId && m.id !== "typing_indicator")
      })
    } finally {
      this.setData({ isWaitingResponse: false })
    }
  },
  async send() {
    const conversationId = this.data.conversationId
    const content = (this.data.text || "").trim()
    if (!conversationId) return
    if (!content) return

    const tempId = `m_temp_${Date.now()}`
    const optimistic: UiMessage = {
      id: tempId,
      role: "user",
      type: "text",
      content,
      createdAt: Date.now()
    }

    const typingMsg: UiMessage = {
      id: "typing_indicator",
      role: "bot",
      type: "text",
      content: "",
      createdAt: Date.now(),
      displayTime: "",
      showTime: false,
      isTyping: true
    }

    this.setData({
      messages: [...this.data.messages, optimistic, typingMsg],
      text: "",
      scrollTo: "typing_indicator",
      isWaitingResponse: true
    })

    try {
      await sendSupportMessage(conversationId, content)
      await this.refreshMessages(true)
    } catch {
      wx.showToast({ title: "发送失败", icon: "none" })
      this.setData({
        messages: this.data.messages.filter((m) => m.id !== tempId && m.id !== "typing_indicator")
      })
    } finally {
      this.setData({ isWaitingResponse: false })
    }
  }
})
