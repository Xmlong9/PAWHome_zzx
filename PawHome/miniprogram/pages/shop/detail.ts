import { ShopProduct, addToCart, getProductDetail, toggleFavorite } from "../../services/shop"

Page({
  data: {
    productId: "",
    product: null as ShopProduct | null,
    selectedSpec: "",
    quantity: 1,
    loading: true,
    safeTop: 0,
    safeBottom: 0,
    soldText: "",
    currentTab: "detail" as "detail" | "reviews" | "qa",
    detailItems: [
      { label: "适用犬种", value: "中大型犬" },
      { label: "适用年龄", value: "1-7岁成犬" },
      { label: "特殊功能", value: "助消化 补充营养" }
    ],
    reviewTags: ["适口性好", "颗粒均匀", "发货快"],
    qaList: [
      { q: "这款粮适合玻璃胃狗狗吗？", a: "配方偏温和，建议先少量换粮，观察适应情况后再逐步增加。" },
      { q: "开封后怎么保存？", a: "建议密封后放在阴凉干燥处，并尽量在30天内食用完。" }
    ]
  },
  onLoad(options: Record<string, string | undefined>) {
    const productId = options.id || "p1"
    const info = wx.getSystemInfoSync()
    const safeBottom = info.safeArea ? info.screenHeight - info.safeArea.bottom : 0
    this.setData({
      productId,
      safeTop: info.statusBarHeight || 0,
      safeBottom
    })
    this.loadDetail()
  },
  async loadDetail() {
    this.setData({ loading: true })
    try {
      const product = await getProductDetail(this.data.productId)
      const nextSpec = product?.specs?.includes(this.data.selectedSpec) ? this.data.selectedSpec : product?.specs?.[0] || ""
      this.setData({
        product,
        selectedSpec: nextSpec,
        soldText: this.formatSoldCount(product?.soldCount || 0)
      })
    } catch {
      wx.showToast({ title: "加载失败", icon: "none" })
    } finally {
      this.setData({ loading: false })
    }
  },
  chooseSpec(e: WechatMiniprogram.TouchEvent) {
    const { value } = e.currentTarget.dataset as { value: string }
    this.setData({ selectedSpec: value })
  },
  switchTab(e: WechatMiniprogram.TouchEvent) {
    const { tab } = e.currentTarget.dataset as { tab: "detail" | "reviews" | "qa" }
    this.setData({ currentTab: tab })
  },
  minusCount() {
    const next = Math.max(1, this.data.quantity - 1)
    this.setData({ quantity: next })
  },
  plusCount() {
    this.setData({ quantity: this.data.quantity + 1 })
  },
  async toggleFav() {
    if (!this.data.product) return
    await toggleFavorite(this.data.product.id)
    await this.loadDetail()
  },
  async addCart() {
    if (!this.data.product) return
    await addToCart(this.data.product.id, this.data.quantity)
    wx.showToast({ title: "已加入购物车", icon: "success" })
  },
  buyNow() {
    if (!this.data.product) return
    const id = encodeURIComponent(this.data.product.id)
    const count = this.data.quantity
    wx.navigateTo({ url: `/pages/shop/order/checkout?from=detail&productId=${id}&count=${count}` })
  },
  goCart() {
    wx.navigateTo({ url: "/pages/cart/index" })
  },
  contactService() {
    wx.navigateTo({ url: "/pages/shop/customer-service" })
  },
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/shop/index" })
  },
  formatSoldCount(value: number) {
    if (value >= 10000) {
      const count = Math.round((value / 1000)) / 10
      return `${count}w`
    }
    return String(value)
  }
})
