import { CheckoutPreview, buildCheckoutPreview, submitOrder, getDefaultAddress, listAddresses, UserAddress, payOrderMock } from "../../../services/shop"

Page({
  data: {
    from: "cart" as "cart" | "detail",
    productId: "",
    count: 1,
    address: null as UserAddress | null,
    payType: "wx" as "wx" | "alipay" | "balance",
    preview: null as CheckoutPreview | null,
    walletBalance: Number(wx.getStorageSync("wallet_balance") || 0)
  },
  onShow() {
    const picked = wx.getStorageSync("checkout_selected_address")
    if (picked && typeof picked === "object") {
      wx.removeStorageSync("checkout_selected_address")
      this.setData({ address: picked as UserAddress })
    }
    const walletBalance = Number(wx.getStorageSync("wallet_balance") || 0)
    this.setData({ walletBalance })
    if (this.data.payType === "balance" && this.data.preview && walletBalance + 1e-9 < this.data.preview.payableAmount) {
      this.setData({ payType: "wx" })
    }
  },
  async onLoad(options: Record<string, string | undefined>) {
    const from = (options.from as "cart" | "detail") || "cart"
    const productId = options.productId || ""
    const count = Number(options.count || 1)
    this.setData({ from, productId, count: Number.isNaN(count) ? 1 : count })
    this.loadPreview()
    this.loadAddress()
  },
  async loadAddress() {
    try {
      const address = await getDefaultAddress()
      if (address) {
        this.setData({ address })
        return
      }
      const list = await listAddresses()
      const picked = list.find((a) => a.isDefault) || list[0] || null
      this.setData({ address: picked })
    } catch (e) {
      console.error(e)
    }
  },
  async loadPreview() {
    try {
      const preview = await buildCheckoutPreview({
        from: this.data.from,
        productId: this.data.productId || undefined,
        count: this.data.count
      })
      const walletBalance = Number(wx.getStorageSync("wallet_balance") || 0)
      this.setData({ preview, walletBalance })
      if (this.data.payType === "balance" && walletBalance + 1e-9 < preview.payableAmount) {
        this.setData({ payType: "wx" })
      }
    } catch {
      wx.showToast({ title: "预览失败", icon: "none" })
    }
  },
  choosePayType(e: WechatMiniprogram.TouchEvent) {
    const { value } = e.currentTarget.dataset as { value: "wx" | "alipay" | "balance" }
    if (value === "balance") {
      const preview = this.data.preview
      if (preview && this.data.walletBalance + 1e-9 < preview.payableAmount) {
        wx.showToast({ title: "余额不足，请先充值", icon: "none" })
        wx.navigateTo({ url: "/pages/shop/recharge" })
        return
      }
    }
    this.setData({ payType: value })
  },
  goChooseAddress() {
    const selectedId = this.data.address?.id ? encodeURIComponent(this.data.address.id) : ""
    const qs = selectedId ? `?mode=select&selectedId=${selectedId}` : "?mode=select"
    wx.navigateTo({ url: `/pages/my/settings/address/index${qs}` })
  },
  async createOrder() {
    const preview = this.data.preview
    if (!preview || !preview.items.length) {
      wx.showToast({ title: "暂无可下单商品", icon: "none" })
      return
    }
    if (this.data.payType === "balance" && this.data.walletBalance + 1e-9 < preview.payableAmount) {
      wx.showToast({ title: "余额不足，请先充值", icon: "none" })
      wx.navigateTo({ url: "/pages/shop/recharge" })
      return
    }
    if (!this.data.address) {
      wx.showToast({ title: "请先选择收货地址", icon: "none" })
      wx.navigateTo({ url: "/pages/my/settings/address/index?mode=select" })
      return
    }
    try {
      const a = this.data.address
      const order = await submitOrder({
        from: this.data.from,
        productId: this.data.productId || undefined,
        count: this.data.count,
        address: `${a.name} ${a.phone} ${a.province}${a.city}${a.district}${a.detail}`,
        payType: this.data.payType
      })
      if (this.data.payType === "balance") {
        try {
          await payOrderMock(order.id)
          wx.showToast({ title: "支付成功", icon: "success" })
          wx.navigateTo({ url: `/pages/shop/order/list?highlight=${order.id}&paid=1` })
        } catch (error) {
          const msg = (error as any)?.message as string | undefined
          if (msg === "INSUFFICIENT_BALANCE") {
            wx.showToast({ title: "余额不足，请先充值", icon: "none" })
            wx.navigateTo({ url: "/pages/shop/recharge" })
            return
          }
          wx.showToast({ title: "支付失败", icon: "none" })
        }
      } else {
        wx.showToast({ title: "下单成功", icon: "success" })
        wx.navigateTo({ url: `/pages/shop/order/list?highlight=${order.id}` })
      }
    } catch {
      wx.showToast({ title: "下单失败", icon: "none" })
    }
  }
})
