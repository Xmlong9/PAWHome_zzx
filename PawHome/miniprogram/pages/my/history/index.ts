import { getMyHistoryPosts, Post } from "../../../services/posts"

Page({
  data: {
    list: [] as any[]
  },
  async onShow() {
    try {
      const res = await getMyHistoryPosts(1, 20)
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
