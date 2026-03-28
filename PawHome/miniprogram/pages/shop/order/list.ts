import { ShopOrder, ShopOrderStatus, listOrders, deleteOrder, payOrderMock, confirmOrderReceipt } from "../../../services/shop"

type OrderTab = { key: ShopOrderStatus; label: string }
type OrderViewItem = ShopOrder & { displayTime: string }

Page({
  data: {
    currentStatus: "all" as ShopOrderStatus,
    tabs: [
      { key: "all", label: "全部" },
      { key: "pending_pay", label: "待支付" },
      { key: "shipping", label: "待收货" },
      { key: "done", label: "已完成" },
      { key: "closed", label: "已关闭" }
    ] as OrderTab[],
    list: [] as OrderViewItem[],
    highlight: "",
    showPaidBanner: false,
    showConfirmModal: false,
    confirmingOrder: null as OrderViewItem | null
  },
  onLoad(options: Record<string, string | undefined>) {
    const highlight = options.highlight || ""
    const showPaidBanner = options.paid === "1"
    this.setData({ highlight, showPaidBanner })
  },
  onShow() {
    this.loadOrders()
  },
  dismissPaidBanner() {
    this.setData({ showPaidBanner: false })
  },
  goShopHome() {
    wx.switchTab({ url: "/pages/shop/index" })
  },
  async loadOrders() {
    try {
      const raw = await listOrders(this.data.currentStatus)
      const list = raw.map((item) => ({
        ...item,
        displayTime: this.formatTime(item.createdAt),
        statusText: this.getStatusText(item.status),
        totalCount: item.items ? item.items.reduce((sum, i) => sum + i.count, 0) : 0
      }))
      this.setData({ list })
    } catch {
      wx.showToast({ title: "加载失败", icon: "none" })
    }
  },
  getStatusText(status: string) {
    const map: Record<string, string> = {
      pending_pay: "待支付",
      shipping: "卖家已发货",
      done: "交易成功",
      closed: "交易关闭"
    }
    return map[status] || status
  },
  goToDetail(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/shop/order/detail/index?id=${id}` })
  },
  goToProductDetail(e: WechatMiniprogram.TouchEvent) {
    const { productId } = e.currentTarget.dataset
    if (productId) {
      wx.navigateTo({ url: `/pages/shop/detail?id=${productId}` })
    }
  },
  stopProp() {
    // 阻止冒泡
  },
  onDeleteOrder(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.showActionSheet({
      itemList: ['删除订单'],
      itemColor: '#FF4D4F',
      success: async (res) => {
        if (res.tapIndex === 0) {
          wx.showLoading({ title: '删除中...' })
          try {
            await deleteOrder(id)
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadOrders()
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },
  async onPayOrder(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.showLoading({ title: '支付中...' })
    try {
      await payOrderMock(id)
      wx.hideLoading()
      wx.showToast({ title: '支付成功', icon: 'success' })
      this.setData({ showPaidBanner: true, highlight: id })
      this.loadOrders()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '支付失败', icon: 'none' })
    }
  },
  onViewLogistics(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/shop/order/logistics/index?id=${id}` })
  },
  onConfirmReceipt(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    const order = this.data.list.find(o => o.id === id)
    if (order) {
      this.setData({
        showConfirmModal: true,
        confirmingOrder: order
      })
    }
  },
  closeConfirmModal() {
    this.setData({
      showConfirmModal: false,
      confirmingOrder: null
    })
  },
  async submitConfirmReceipt() {
    const order = this.data.confirmingOrder
    if (!order) return
    wx.showLoading({ title: '确认中...' })
    try {
      await confirmOrderReceipt(order.id)
      wx.hideLoading()
      wx.showToast({ title: '收货成功', icon: 'success' })
      this.closeConfirmModal()
      this.loadOrders()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },
  switchStatus(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset as { key: ShopOrderStatus }
    this.setData({ currentStatus: key })
    this.loadOrders()
  },
  formatTime(ts: number) {
    const date = new Date(ts)
    const m = `${date.getMonth() + 1}`.padStart(2, "0")
    const d = `${date.getDate()}`.padStart(2, "0")
    const hh = `${date.getHours()}`.padStart(2, "0")
    const mm = `${date.getMinutes()}`.padStart(2, "0")
    return `${m}-${d} ${hh}:${mm}`
  }
})
