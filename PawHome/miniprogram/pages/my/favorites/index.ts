import { getPosts, Post } from "../../../services/posts"

Page({
  data: {
    list: [] as any[]
  },
  async onShow() {
    try {
      const posts = await getPosts()
      // 模拟过滤出我收藏的帖子（目前只要 isFavorited 为 true 的）
      const favPosts = posts.filter(p => p.isFavorited)
      this.setData({ list: favPosts })
    } catch (e) {
      console.error(e)
    }
  },
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/post-detail/index?id=${id}` })
  }
})