import { ShopOrder, listOrders, getDefaultAddress, UserAddress } from "../../../../services/shop"

Page({
  data: {
    order: null as (ShopOrder & { displayTime: string; statusText: string }) | null,
    address: null as UserAddress | null
  },
  async onLoad(options: Record<string, string | undefined>) {
    const id = options.id
    if (id) {
      this.loadOrderDetail(id)
    }
    this.loadAddress()
  },
  async loadAddress() {
    try {
      const address = await getDefaultAddress()
      this.setData({ address })
    } catch (e) {
      console.error(e)
    }
  },
  async loadOrderDetail(id: string) {
    try {
      // 模拟通过 list 过滤获取详情
      const rawList = await listOrders("all")
      const raw = rawList.find((item) => item.id === id)
      if (raw) {
        const order = {
          ...raw,
          displayTime: this.formatTime(raw.createdAt),
          statusText: this.getStatusText(raw.status)
        }
        this.setData({ order })
      } else {
        wx.showToast({ title: "订单不存在", icon: "none" })
      }
    } catch {
      wx.showToast({ title: "加载失败", icon: "none" })
    }
  },
  getStatusText(status: string) {
    const map: Record<string, string> = {
      pending_pay: "等待买家付款",
      shipping: "卖家已发货",
      done: "交易成功",
      closed: "交易关闭"
    }
    return map[status] || status
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
  copyId() {
    if (this.data.order) {
      wx.setClipboardData({
        data: this.data.order.id,
        success: () => wx.showToast({ title: "复制成功", icon: "success" })
      })
    }
  }
})