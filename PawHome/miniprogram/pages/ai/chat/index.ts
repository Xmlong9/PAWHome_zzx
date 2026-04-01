import {
  closeSupportConversation,
  createSupportConversation,
  listSupportMessages,
  sendSupportMessage,
  SupportMessage
} from "../../../services/support"
import { navigateBackWithTransition } from "../../../utils/transition"

type UiMessage = SupportMessage & { displayTime?: string; showTime?: boolean; isTyping?: boolean }

Page({
  data: {
    mode: "smart" as "smart" | "human",
    conversationId: "",
    startedAt: 0,
    sessionDisplayTime: "",
    messages: [] as UiMessage[],
    text: "",
    scrollTo: "bottom",
    statusBarHeight: 20,
    navBarHeight: 44,
    pageVisible: false,
    pageLeaving: false,
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

    const mode = "smart"
    const forceNew = options.forceNew === "1" || options.forceNew === "true"
    const conversationId = forceNew ? "" : (options.conversationId || "")
    const prefill = options.prefill ? decodeURIComponent(options.prefill) : ""
    const startedAt = Number(options.startedAt || 0)
    this.setData({ mode, conversationId, startedAt, sessionDisplayTime: startedAt ? this.formatTimeFull(startedAt) : "" })

    if (conversationId) {
      await this.refreshMessages()
      return
    }

    try {
      const conv = await createSupportConversation(mode, { forceNew: true, channel: "ai_pet" })
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
  onShow() {
    setTimeout(() => {
      this.setData({ pageVisible: true })
    }, 50)
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
    this.setData({ pageLeaving: true })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        navigateBackWithTransition()
        return
      }
      wx.switchTab({ url: "/pages/ai/index" })
    }, 300)
  },
  async send() {
    const text = this.data.text.trim()
    if (!text) return
    const cid = this.data.conversationId
    if (!cid) return

    const tempId = `m_temp_${Date.now()}`
    const tempMsg: UiMessage = {
      id: tempId,
      role: "user",
      type: "text",
      content: text,
      createdAt: Date.now(),
      displayTime: "",
      showTime: false
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
      messages: [...this.data.messages, tempMsg, typingMsg],
      text: "",
      scrollTo: "typing_indicator",
      isWaitingResponse: true
    })

    try {
      await sendSupportMessage(cid, text)
      await this.refreshMessages(true)
    } catch (e: any) {
      wx.showToast({ title: e.message || "发送失败", icon: "none" })
      this.setData({
        messages: this.data.messages.filter((m) => m.id !== tempId && m.id !== "typing_indicator")
      })
    } finally {
      this.setData({ isWaitingResponse: false })
    }
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
  }
})