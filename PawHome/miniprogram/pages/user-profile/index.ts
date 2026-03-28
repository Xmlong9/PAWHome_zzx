import { followUser, getUserProfile, unfollowUser, UserProfile } from "../../services/user";
import { Post, getUserFavoritePosts, getUserLikedPosts, getUserPosts } from "../../services/posts";
import {
  enterPageTransition,
  initPageTransition,
  navigateBackWithTransition,
  navigateToWithTransition,
  reenterPageIfNeeded
} from "../../utils/transition";

Page({
  data: {
    safeTop: 0,
    userId: '',
    isSelf: false,
    userInfo: null as UserProfile | null,
    isFollowing: false, // 是否已关注
    
    // Tabs
    tabs: ['帖子', '点赞', '收藏'],
    currentTab: '帖子',
    
    // 列表数据
    posts: [] as Post[],
    likes: [] as Post[], // 假设复用 Post 类型
    favorites: [] as Post[],
    
    loading: false,

    pageMounted: false,
    pageVisible: false,
    pageLeaving: false
  },

  onLoad(options: any) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      safeTop: sysInfo.safeArea?.top || 44,
      userId: options.id || '' // 路由参数传入 userId
    });
    
    this.initPage();
    initPageTransition(this)
  },

  onReady() {
    enterPageTransition(this)
  },

  onShow() {
    reenterPageIfNeeded(this)
    const needRefresh = wx.getStorageSync("user_profile_need_refresh")
    if (!needRefresh) return
    wx.setStorageSync("user_profile_need_refresh", false)
    const fallbackUserId = this.data.userId || this.data.userInfo?.id || wx.getStorageSync("userId") || ""
    if (!fallbackUserId) return
    if (fallbackUserId !== this.data.userId) {
      this.setData({ userId: fallbackUserId })
    }
    getUserProfile(fallbackUserId)
      .then((userInfo) => {
        this.setData({ userInfo, isFollowing: Boolean((userInfo as any)?.isFollowing) })
      })
      .catch(() => {})
    Promise.all([
      this.loadTabData("帖子"),
      this.loadTabData("点赞"),
      this.loadTabData("收藏")
    ]).catch((e) => {
      console.error("refresh profile tabs failed", e)
    })
  },

  async initPage() {
    this.setData({ loading: true });
    try {
      // 1. 获取用户信息
      // 这里如果传入了 id 就获取对应用户，没传就获取自己。
      const myId = wx.getStorageSync('userId') || '324666'; // 这里默认将本人ID固定为324666（淡水鱼）
      const isSelf = !this.data.userId || this.data.userId === myId;
      
      this.setData({ isSelf });
      
      // 如果没传 userId，就默认查自己
      const queryId = this.data.userId || myId;
      this.setData({ userId: queryId })
      const userInfo = await getUserProfile(queryId); 
      
      if (isSelf && userInfo) {
        wx.setNavigationBarTitle({ title: '我的主页' });
      } else if (userInfo) {
        wx.setNavigationBarTitle({ title: '个人主页' });
      }

      // 2. 加载当前 tab 数据
      await this.loadTabData(this.data.currentTab);
      
      this.setData({ userInfo, isFollowing: Boolean((userInfo as any)?.isFollowing) });
    } catch (error) {
      console.error("Load user profile failed", error);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadTabData(tabName: string) {
    try {
      if (tabName === '帖子') {
        const res = await getUserPosts(this.data.userId, 1, 10)
        this.setData({ posts: res.list });
      } else if (tabName === '点赞') {
        const res = await getUserLikedPosts(this.data.userId, 1, 10)
        this.setData({ likes: res.list });
      } else if (tabName === '收藏') {
        const res = await getUserFavoritePosts(this.data.userId, 1, 10)
        this.setData({ favorites: res.list });
      }
    } catch (e) {
      console.error("Load tab data failed", e);
    }
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      navigateBackWithTransition();
    } else {
      wx.switchTab({ url: '/pages/home/index' });
    }
  },

  onFollow() {
    if (this.data.isSelf) return
    const next = !this.data.isFollowing
    this.setData({ isFollowing: next })
    const userId = this.data.userId
    Promise.resolve()
      .then(() => (next ? followUser(userId) : unfollowUser(userId)))
      .then(() => {
        wx.showToast({ title: next ? '已关注' : '已取消关注', icon: 'none' })
      })
      .catch((e) => {
        console.error(e)
        this.setData({ isFollowing: !next })
        wx.showToast({ title: '操作失败', icon: 'none' })
      })
  },

  onMessage() {
    if (!this.data.userInfo) return;
    const peerId = this.data.userInfo.id;
    const nickname = encodeURIComponent(this.data.userInfo.nickname);
    const avatarUrl = encodeURIComponent(this.data.userInfo.avatarUrl);
    
    // 跳转到聊天页面，带上对方的关键信息以便正确展示
    navigateToWithTransition(`/pages/chat/index?peerId=${peerId}&nickname=${nickname}&avatarUrl=${avatarUrl}`);
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;
    
    this.setData({ currentTab: tab });
    
    // 如果数据为空则加载
    if (tab === '帖子' && this.data.posts.length === 0) this.loadTabData(tab);
    if (tab === '点赞' && this.data.likes.length === 0) this.loadTabData(tab);
    if (tab === '收藏' && this.data.favorites.length === 0) this.loadTabData(tab);
  },

  goPostDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    navigateToWithTransition(`/pages/post-detail/index?id=${id}`);
  },

  openRelations(e: any) {
    const type = e.currentTarget.dataset.type
    if (type !== "following" && type !== "followers") return
    const userId = this.data.userId || this.data.userInfo?.id
    if (!userId) return
    navigateToWithTransition(`/pages/user-relations/index?userId=${encodeURIComponent(userId)}&type=${type}`)
  }
});
