import { getMyHistoryPosts, Post } from "../../../services/posts"
import {
  enterPageTransition,
  initPageTransition,
  navigateToWithTransition,
  reenterPageIfNeeded
} from "../../../utils/transition"
import { resolveImageSrc } from "../../../utils/mediaCache"

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
      this.setData({ list: res.list }, () => {
        this.hydrateListMedia(0)
      })
    } catch (e) {
      console.error(e)
    }
  },

  async hydrateListMedia(startIndex = 0) {
    const list = this.data.list || []
    const slice = list.slice(startIndex)
    const tasks = slice.map((post, i) => this.hydrateOnePostMedia(startIndex + i, post))
    await Promise.allSettled(tasks)
  },

  async hydrateOnePostMedia(index: number, post: any) {
    const updates: Record<string, any> = {}
    const avatarUrl = post?.user?.avatarUrl
    if (typeof avatarUrl === "string" && avatarUrl) {
      const nextAvatar = await resolveImageSrc(avatarUrl)
      if (nextAvatar && nextAvatar !== avatarUrl) {
        updates[`list[${index}].user.avatarUrl`] = nextAvatar
      }
    }
    const coverUrl = post?.images?.[0]
    if (typeof coverUrl === "string" && coverUrl) {
      const nextCover = await resolveImageSrc(coverUrl)
      if (nextCover && nextCover !== coverUrl) {
        updates[`list[${index}].images[0]`] = nextCover
      }
    }
    if (Object.keys(updates).length > 0) {
      this.setData(updates)
    }
  },
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    navigateToWithTransition(`/pages/post-detail/index?id=${id}`)
  }
})
