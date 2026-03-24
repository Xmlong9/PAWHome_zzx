import { CheckoutPreview, buildCheckoutPreview, submitOrder, getDefaultAddress, UserAddress } from "../../../services/shop"

Page({
  data: {
    from: "cart" as "cart" | "detail",
    productId: "",
    count: 1,
    address: null as UserAddress | null,
    payType: "wx" as "wx" | "alipay",
    preview: null as CheckoutPreview | null
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
      this.setData({ address })
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
      this.setData({ preview })
    } catch {
      wx.showToast({ title: "预览失败", icon: "none" })
    }
  },
  choosePayType(e: WechatMiniprogram.TouchEvent) {
    const { value } = e.currentTarget.dataset as { value: "wx" | "alipay" }
    this.setData({ payType: value })
  },
  async createOrder() {
    const preview = this.data.preview
    if (!preview || !preview.items.length) {
      wx.showToast({ title: "暂无可下单商品", icon: "none" })
      return
    }
    try {
      const order = await submitOrder({
        from: this.data.from,
        productId: this.data.productId || undefined,
        count: this.data.count,
        address: this.data.address ? `${this.data.address.province}${this.data.address.city}${this.data.address.district}${this.data.address.detail}` : "",
        payType: this.data.payType
      })
      wx.showToast({ title: "下单成功", icon: "success" })
      wx.navigateTo({ url: `/pages/shop/order/list?highlight=${order.id}` })
    } catch {
      wx.showToast({ title: "下单失败", icon: "none" })
    }
  }
})
