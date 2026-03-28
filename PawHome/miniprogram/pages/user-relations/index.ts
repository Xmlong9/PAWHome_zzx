import { createConversation } from "../../services/im"
import { followUser, getUserFollowers, getUserFollowing, unfollowUser, UserRelation } from "../../services/user"
import {
  enterPageTransition,
  initPageTransition,
  navigateToWithTransition,
  reenterPageIfNeeded
} from "../../utils/transition"

Page({
  data: {
    userId: "",
    currentType: "following" as "following" | "followers",
    titleText: "关注",
    list: [] as UserRelation[],
    loading: false,

    pageMounted: false,
    pageVisible: false,
    pageLeaving: false
  },

  onLoad(options: { userId?: string; type?: string }) {
    const userId = options.userId ? decodeURIComponent(options.userId) : ""
    const currentType = options.type === "followers" ? "followers" : "following"
    this.setData({
      userId,
      currentType,
      titleText: currentType === "followers" ? "粉丝" : "关注"
    })
    this.loadList()
    initPageTransition(this)
  },

  onReady() {
    enterPageTransition(this)
  },

  onShow() {
    reenterPageIfNeeded(this)
  },

  switchType(e: any) {
    const type = e.currentTarget.dataset.type as "following" | "followers"
    if (!type || type === this.data.currentType) return
    this.setData({
      currentType: type,
      titleText: type === "followers" ? "粉丝" : "关注"
    })
    this.loadList()
  },

  async loadList() {
    if (!this.data.userId) return
    this.setData({ loading: true })
    try {
      const res = this.data.currentType === "following"
        ? await getUserFollowing(this.data.userId, 1, 50)
        : await getUserFollowers(this.data.userId, 1, 50)
      this.setData({ list: res.list || [] })
    } catch (e) {
      console.error(e)
      this.setData({ list: [] })
      wx.showToast({ title: "加载失败", icon: "none" })
    } finally {
      this.setData({ loading: false })
    }
  },

  openProfile(e: any) {
    const item = e.currentTarget.dataset.item as UserRelation
    if (!item?.id) return
    navigateToWithTransition(`/pages/user-profile/index?id=${item.id}`)
  },

  async onToggleFollow(e: any) {
    const item = e.currentTarget.dataset.item as UserRelation
    if (!item?.id) return
    const isFollowing = !!item.isFollowing
    const list = [...this.data.list]
    const idx = list.findIndex((x) => x.id === item.id)
    if (idx < 0) return
    list[idx] = { ...list[idx], isFollowing: !isFollowing }
    this.setData({ list })
    try {
      if (isFollowing) {
        await unfollowUser(item.id)
      } else {
        await followUser(item.id)
      }
    } catch (e) {
      console.error(e)
      list[idx] = { ...list[idx], isFollowing }
      this.setData({ list })
      wx.showToast({ title: "操作失败", icon: "none" })
    }
  },

  async openChat(e: any) {
    const item = e.currentTarget.dataset.item as UserRelation
    if (!item?.id) return
    try {
      const res = await createConversation(item.id)
      const nickname = encodeURIComponent(item.nickname || "")
      const avatarUrl = encodeURIComponent(item.avatarUrl || "")
      navigateToWithTransition(`/pages/chat/index?id=${encodeURIComponent(res.id)}&peerId=${encodeURIComponent(item.id)}&nickname=${nickname}&avatarUrl=${avatarUrl}`)
    } catch (err) {
      console.error(err)
      const nickname = encodeURIComponent(item.nickname || "")
      const avatarUrl = encodeURIComponent(item.avatarUrl || "")
      navigateToWithTransition(`/pages/chat/index?peerId=${encodeURIComponent(item.id)}&nickname=${nickname}&avatarUrl=${avatarUrl}`)
    }
  }
})
