import { ShopOrder, listOrders, getDefaultAddress, payOrderMock, confirmOrderReceipt, UserAddress } from "../../../../services/shop"

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
  goCustomerService() {
    wx.navigateTo({ url: "/pages/shop/customer-service" })
  },
  async onPayOrder(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget.dataset as any)?.id as string
    if (!id) return
    wx.showLoading({ title: "支付中..." })
    try {
      await payOrderMock(id)
      wx.showToast({ title: "支付成功", icon: "success" })
      wx.redirectTo({ url: `/pages/shop/order/list?highlight=${encodeURIComponent(id)}&paid=1` })
    } catch {
      wx.showToast({ title: "支付失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  },
  onConfirmReceipt(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget.dataset as any)?.id as string
    if (!id) return
    wx.showModal({
      title: "确认收货",
      content: "请确认已收到商品后再确认收货",
      confirmText: "确认收货",
      success: async (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: "确认中..." })
        try {
          await confirmOrderReceipt(id)
          wx.showToast({ title: "收货成功", icon: "success" })
          await this.loadOrderDetail(id)
        } catch {
          wx.showToast({ title: "操作失败", icon: "none" })
        } finally {
          wx.hideLoading()
        }
      }
    })
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
