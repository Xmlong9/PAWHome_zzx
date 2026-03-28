import { formatTime, listConversations } from "../../services/im"
import {
  getNotificationUnreadSummary,
  listNotifications,
  markNotificationsRead
} from "../../services/notifications"
import {
  enterPageTransition,
  initPageTransition,
  navigateBackWithTransition,
  navigateToWithTransition,
  reenterPageIfNeeded
} from "../../utils/transition"

type LikeMsg = {
  id: string
  avatarUrl: string
  nickname: string
  time: string
  text: string
  postId?: string
  thumbUrl?: string
}

type CommentMsg = {
  id: string
  avatarUrl: string
  nickname: string
  time: string
  text: string
  content?: string
  postId?: string
  thumbUrl?: string
}

type DMMsg = {
  id: string
  peerId: string
  avatarUrl: string
  nickname: string
  time: string
  lastMessage: string
  unreadCount: number
}

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    currentTab: 'like' as 'like' | 'comment' | 'dm',
    likeList: [] as LikeMsg[],
    commentList: [] as CommentMsg[],
    dmList: [] as DMMsg[],
    hasUnreadLike: false,
    hasUnreadComment: false,
    hasUnreadDm: false,

    pageMounted: false,
    pageVisible: false,
    pageLeaving: false
  },

  async onLoad() {
    const sys = wx.getSystemInfoSync()
    const statusBarHeight = sys.statusBarHeight || 0
    const rpxToPx = (rpx: number) => Math.round((rpx * sys.screenWidth) / 750)
    const tabsHeightPx = rpxToPx(80)
    const navHeight = statusBarHeight + 44 + tabsHeightPx

    this.setData({
      statusBarHeight,
      navHeight,
      likeList: [],
      commentList: []
    })

    initPageTransition(this)
    await this.refreshAll()
  },

  onReady() {
    enterPageTransition(this)
  },

  async onShow() {
    reenterPageIfNeeded(this)
    await this.refreshAll()
  },

  async refreshAll() {
    await this.loadNotifications()
    await this.loadDMConversations()
    await this.markCurrentTabRead(this.data.currentTab)
    this.syncIconBadge()
  },

  async loadNotifications() {
    try {
      const [summary, likeRes, favRes, followRes, commentRes] = await Promise.all([
        getNotificationUnreadSummary(),
        listNotifications("like", 1, 20),
        listNotifications("favorite", 1, 20),
        listNotifications("follow", 1, 20),
        listNotifications("comment", 1, 20)
      ])

      const likeList: LikeMsg[] = [...likeRes.list, ...favRes.list, ...followRes.list]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .map((n) => ({
          id: n.id,
          avatarUrl: n.avatarUrl,
          nickname: n.nickname,
          time: formatTime(n.createdAt),
          text: n.text,
          postId: n.postId || undefined,
          thumbUrl: n.thumbUrl || undefined
        }))

      const commentList: CommentMsg[] = commentRes.list.map((n) => ({
        id: n.id,
        avatarUrl: n.avatarUrl,
        nickname: n.nickname,
        time: formatTime(n.createdAt),
        text: n.text,
        content: n.content || "",
        postId: n.postId || undefined,
        thumbUrl: n.thumbUrl || undefined
      }))

      this.setData({
        likeList,
        commentList,
        hasUnreadLike: summary.like + summary.favorite + summary.follow > 0,
        hasUnreadComment: summary.comment > 0
      })
    } catch (e) {
      console.error(e)
      this.setData({ likeList: [], commentList: [], hasUnreadLike: false, hasUnreadComment: false })
    }
  },

  async markCurrentTabRead(tab: 'like' | 'comment' | 'dm') {
    try {
      if (tab === "like") {
        await Promise.all([
          markNotificationsRead({ type: "like" }),
          markNotificationsRead({ type: "favorite" }),
          markNotificationsRead({ type: "follow" })
        ])
        this.setData({ hasUnreadLike: false })
        return
      }
      if (tab === "comment") {
        await markNotificationsRead({ type: "comment" })
        this.setData({ hasUnreadComment: false })
      }
    } catch {
    }
  },

  syncIconBadge() {
    const totalUnreadDm = this.data.dmList.reduce((sum, item) => sum + item.unreadCount, 0)
    const total = (this.data.hasUnreadLike ? 1 : 0) + (this.data.hasUnreadComment ? 1 : 0) + totalUnreadDm
    wx.setStorageSync("community_message_unread_total", total)
  },

  async loadDMConversations() {
    try {
      const list = await listConversations()
      const dmList: DMMsg[] = list.map((c) => ({
        id: c.id,
        peerId: c.peerId,
        avatarUrl: c.peerAvatarUrl,
        nickname: c.peerNickname,
        time: formatTime(c.lastMessageAt),
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount
      }))
      this.setData({ dmList, hasUnreadDm: dmList.some((item) => item.unreadCount > 0) })
    } catch {
      const dmList = this.getMockDMList()
      this.setData({ dmList, hasUnreadDm: dmList.some((item) => item.unreadCount > 0) })
    }
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      navigateBackWithTransition()
      return
    }
    wx.switchTab({ url: '/pages/community/index' })
  },

  async switchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as 'like' | 'comment' | 'dm'
    this.setData({ currentTab: tab })
    await this.markCurrentTabRead(tab)
    this.syncIconBadge()
  },

  openItem(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type
    const item = e.currentTarget.dataset.item
    if (type === 'dm') {
      const dm = item as DMMsg
      // 跳转时一定要带上 id (conversationId)，peerId，nickname 和 avatarUrl，保证两边一致
      navigateToWithTransition(`/pages/chat/index?id=${dm.id}&peerId=${dm.peerId}&nickname=${encodeURIComponent(dm.nickname)}&avatarUrl=${encodeURIComponent(dm.avatarUrl)}`)
    } else {
      if (item.postId) {
        navigateToWithTransition(`/pages/post-detail/index?id=${item.postId}`)
      }
    }
  },


  getMockDMList(): DMMsg[] {
    return [
      {
        id: 'd1',
        peerId: 'u301',
        avatarUrl: 'https://picsum.photos/seed/u301/100',
        nickname: '好友A',
        time: '刚刚',
        lastMessage: '在吗？想问下你家猫粮是哪款',
        unreadCount: 2
      },
      {
        id: 'd2',
        peerId: 'u302',
        avatarUrl: 'https://picsum.photos/seed/u302/100',
        nickname: '好友B',
        time: '昨天',
        lastMessage: '哈哈哈太可爱了',
        unreadCount: 0
      }
    ]
  }
})
