import { getUserFavoritePosts, Post } from "../../../services/posts"

Page({
  data: {
    list: [] as any[]
  },
  async onShow() {
    try {
      const userId = wx.getStorageSync("userId") as string
      const res = await getUserFavoritePosts(userId, 1, 20)
      this.setData({ list: res.list })
    } catch (e) {
      console.error(e)
    }
  },
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/post-detail/index?id=${id}` })
  }
})
