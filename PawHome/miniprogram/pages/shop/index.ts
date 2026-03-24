import { ShopProduct, listProducts, toggleFavorite } from "../../services/shop"

type ShopEntry = {
  id: string
  title: string
  icon: string
  url: string
}

Page({
  data: {
    safeTop: 0,
    searchText: "",
    banners: ["/assets/images/shop/广告.png"],
    entries: [
      { id: "order", title: "订单", icon: "/assets/icons/shop/订单.png", url: "/pages/shop/order/list" },
      { id: "recharge", title: "充值", icon: "/assets/icons/shop/充值.png", url: "/pages/shop/recharge" },
      { id: "service", title: "客服", icon: "/assets/icons/shop/客服.png", url: "/pages/shop/customer-service" },
      { id: "favorites", title: "收藏", icon: "/assets/icons/shop/收藏.png", url: "/pages/shop/favorites" }
    ] as ShopEntry[],
    products: [] as ShopProduct[],
    loading: false
  },
  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchText: e.detail.value || "" })
  },
  onLoad() {
    const info = wx.getSystemInfoSync()
    this.setData({
      safeTop: (info.statusBarHeight || 0) + 10
    })
  },
  onShow() {
    this.loadProducts()
  },
  async loadProducts() {
    this.setData({ loading: true })
    try {
      const products = await listProducts()
      this.setData({ products })
    } catch {
      wx.showToast({ title: "商品加载失败", icon: "none" })
    } finally {
      this.setData({ loading: false })
    }
  },
  goCart() {
    wx.navigateTo({ url: "/pages/cart/index" })
  },
  tapEntry(e: WechatMiniprogram.TouchEvent) {
    const { url } = e.currentTarget.dataset as { url: string }
    wx.navigateTo({ url })
  },
  tapProduct(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    wx.navigateTo({ url: `/pages/shop/detail?id=${encodeURIComponent(id)}` })
  },
  openBannerDetail() {
    wx.navigateTo({ url: "/pages/shop/detail?id=p1" })
  },
  async tapFavorite(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    await toggleFavorite(id)
    await this.loadProducts()
  }
})
