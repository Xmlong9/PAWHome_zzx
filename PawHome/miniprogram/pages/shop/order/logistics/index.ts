import { ShopOrder, listOrders, getOrderLogistics } from "../../../../services/shop"

Page({
  data: {
    showMoreLogistics: false,
    showMoreOrder: false,
    markers: [
      {
        id: 1,
        latitude: 30.28,
        longitude: 120.00
      }
    ],
    order: null as (ShopOrder & { displayTime: string }) | null,
    address: null as { name: string; phone: string; detail: string } | null,
    events: [] as Array<{ type: string; at: number; text: string; displayTime: string }>,
    summaryText: "",
    summaryTime: "",
    summaryDesc: ""
  },
  async onLoad(options: Record<string, string | undefined>) {
    const id = options.id || "SO10000" // 兜底默认值
    if (id) {
      try {
        const rawList = await listOrders("all")
        const raw = rawList.find((item) => item.id === id)
        if (raw) {
          const order = {
            ...raw,
            displayTime: this.formatTime(raw.createdAt)
          }
          this.setData({ order })
        }
      } catch (e) {
        console.error(e)
      }
    }
    try {
      const logistics = await getOrderLogistics(id)
      const events = (logistics.events || []).map((e) => ({
        ...e,
        displayTime: this.formatMDHM(e.at)
      }))
      const top = events[0]
      const summaryText = top?.type === "signed"
        ? "已签收"
        : top?.type === "shipped"
          ? "运输中"
          : top?.type === "paid"
            ? "已支付"
            : "已下单"
      const summaryTime = top?.displayTime || ""
      const summaryDesc = top?.text || ""
      this.setData({
        address: logistics.address || null,
        events,
        summaryText,
        summaryTime,
        summaryDesc
      })
    } catch (e) {
      console.error(e)
    }
  },
  formatTime(ts: number) {
    const date = new Date(ts)
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    const ss = `${date.getSeconds()}`.padStart(2, "0")
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
  },
  formatMDHM(ts: number) {
    const date = new Date(ts)
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    return `${m}-${d} ${hh}:${mm}`
  },
  copyId() {
    if (this.data.order) {
      wx.setClipboardData({
        data: this.data.order.id,
        success: () => wx.showToast({ title: "复制成功", icon: "success" })
      })
    }
  },
  toggleLogistics() {
    this.setData({ showMoreLogistics: !this.data.showMoreLogistics })
  },
  toggleOrder() {
    this.setData({ showMoreOrder: !this.data.showMoreOrder })
  }
})
