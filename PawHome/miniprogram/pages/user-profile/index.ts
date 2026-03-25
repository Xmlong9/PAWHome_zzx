import { getUserProfile, UserProfile } from "../../services/user";
import { Post, getPosts } from "../../services/posts";

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
    
    loading: false
  },

  onLoad(options: any) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      safeTop: sysInfo.safeArea?.top || 44,
      userId: options.id || '' // 路由参数传入 userId
    });
    
    this.initPage();
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
      const userInfo = await getUserProfile(queryId); 
      
      if (isSelf && userInfo) {
        wx.setNavigationBarTitle({ title: '我的主页' });
      } else if (userInfo) {
        wx.setNavigationBarTitle({ title: '个人主页' });
      }

      // 2. 加载当前 tab 数据
      await this.loadTabData(this.data.currentTab);
      
      this.setData({ userInfo });
    } catch (error) {
      console.error("Load user profile failed", error);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadTabData(tabName: string) {
    // 模拟加载对应的数据
    try {
      const res = await getPosts(1, 10);
      if (tabName === '帖子') {
        this.setData({ posts: res.list });
      } else if (tabName === '点赞') {
        this.setData({ likes: res.list });
      } else if (tabName === '收藏') {
        this.setData({ favorites: res.list });
      }
    } catch (e) {
      console.error("Load tab data failed", e);
    }
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/home/index' });
    }
  },

  onFollow() {
    // 关注/取消关注逻辑
    this.setData({ isFollowing: !this.data.isFollowing });
    wx.showToast({
      title: this.data.isFollowing ? '已关注' : '已取消关注',
      icon: 'none'
    });
  },

  onMessage() {
    if (!this.data.userInfo) return;
    const peerId = this.data.userInfo.id;
    const nickname = encodeURIComponent(this.data.userInfo.nickname);
    const avatarUrl = encodeURIComponent(this.data.userInfo.avatarUrl);
    
    // 跳转到聊天页面，带上对方的关键信息以便正确展示
    wx.navigateTo({
      url: `/pages/chat/index?peerId=${peerId}&nickname=${nickname}&avatarUrl=${avatarUrl}`
    });
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
    wx.navigateTo({ url: `/pages/post-detail/index?id=${id}` });
  }
});