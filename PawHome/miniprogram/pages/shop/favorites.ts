import { ShopProduct, listFavorites, toggleFavorite } from "../../services/shop"

Page({
  data: {
    list: [] as ShopProduct[]
  },
  onShow() {
    this.loadList()
  },
  async loadList() {
    const list = await listFavorites()
    this.setData({ list })
  },
  openDetail(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    wx.navigateTo({ url: `/pages/shop/detail?id=${encodeURIComponent(id)}` })
  },
  async cancelFavorite(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    await toggleFavorite(id)
    await this.loadList()
  }
})
