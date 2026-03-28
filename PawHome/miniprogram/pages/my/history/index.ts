import { getMyHistoryPosts, Post } from "../../../services/posts"
import {
  enterPageTransition,
  initPageTransition,
  navigateToWithTransition,
  reenterPageIfNeeded
} from "../../../utils/transition"

Page({
  data: {
    list: [] as any[],

    pageMounted: false,
    pageVisible: false,
    pageLeaving: false
  },
  onLoad() {
    initPageTransition(this)
  },
  onReady() {
    enterPageTransition(this)
  },
  async onShow() {
    reenterPageIfNeeded(this)
    try {
      const res = await getMyHistoryPosts(1, 20)
      this.setData({ list: res.list })
    } catch (e) {
      console.error(e)
    }
  },
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    navigateToWithTransition(`/pages/post-detail/index?id=${id}`)
  }
})
