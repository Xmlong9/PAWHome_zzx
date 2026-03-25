import { formatTime, listConversations } from "../../services/im"

type LikeMsg = {
  id: string
  avatarUrl: string
  nickname: string
  time: string
  text: string
  postId?: number
  thumbUrl?: string
}

type CommentMsg = {
  id: string
  avatarUrl: string
  nickname: string
  time: string
  text: string
  content?: string
  postId?: number
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
    dmList: [] as DMMsg[]
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
      likeList: this.getMockLikeList(),
      commentList: this.getMockCommentList()
    })
    await this.loadDMConversations()
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
      
      // 就算捕获到错误，我们也尽量合并本地真实缓存的对话列表和写死的 mock 列表
      this.setData({ dmList })
    } catch {
      this.setData({ dmList: this.getMockDMList() })
    }
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/community/index' })
  },

  switchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as 'like' | 'comment' | 'dm'
    this.setData({ currentTab: tab })
  },

  openItem(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type
    const item = e.currentTarget.dataset.item
    if (type === 'dm') {
      const dm = item as DMMsg
      // 跳转时一定要带上 id (conversationId)，peerId，nickname 和 avatarUrl，保证两边一致
      wx.navigateTo({
        url: `/pages/chat/index?id=${dm.id}&peerId=${dm.peerId}&nickname=${encodeURIComponent(dm.nickname)}&avatarUrl=${encodeURIComponent(dm.avatarUrl)}`
      })
    } else {
      if (item.postId) {
        wx.navigateTo({
          url: `/pages/post-detail/index?id=${item.postId}`
        })
      }
    }
  },

  getMockLikeList(): LikeMsg[] {
    return [
      {
        id: 'l1',
        avatarUrl: 'https://picsum.photos/seed/u101/100',
        nickname: '淡水鱼鱼鱼鱼鱼鱼鱼',
        time: '10分钟前',
        text: '赞了你的帖子',
        postId: 1,
        thumbUrl: 'https://picsum.photos/seed/p1/120/120'
      },
      {
        id: 'l2',
        avatarUrl: 'https://picsum.photos/seed/u102/100',
        nickname: '赵嘉航',
        time: '2小时前',
        text: '收藏了你的帖子',
        postId: 2,
        thumbUrl: 'https://picsum.photos/seed/p2/120/120'
      }
    ]
  },

  getMockCommentList(): CommentMsg[] {
    return [
      {
        id: 'c1',
        avatarUrl: 'https://picsum.photos/seed/u201/100',
        nickname: '赵嘉航',
        time: '1小时前',
        text: '评论了你的帖子',
        content: '哈哈哈哈哈哈哈我家那只也经常这样！',
        postId: 1,
        thumbUrl: 'https://picsum.photos/seed/p1/120/120'
      },
      {
        id: 'c2',
        avatarUrl: 'https://picsum.photos/seed/u202/100',
        nickname: '用户202',
        time: '昨天',
        text: '@了你',
        content: '快来看这个！',
        postId: 2,
        thumbUrl: 'https://picsum.photos/seed/p2/120/120'
      }
    ]
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
