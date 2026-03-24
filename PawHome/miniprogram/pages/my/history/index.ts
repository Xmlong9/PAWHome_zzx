import { getPosts, Post } from "../../../services/posts"

Page({
  data: {
    list: [] as any[]
  },
  async onShow() {
    try {
      const posts = await getPosts()
      // 模拟过滤出浏览过的帖子（这里取前 5 个作为浏览历史的 mock 数据）
      const historyPosts = posts.slice(0, 5)
      this.setData({ list: historyPosts })
    } catch (e) {
      console.error(e)
    }
  },
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/post-detail/index?id=${id}` })
  }
})