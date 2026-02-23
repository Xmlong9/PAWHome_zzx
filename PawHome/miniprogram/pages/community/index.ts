import { getPosts, favoritePost, unfavoritePost, Post } from "../../services/posts";
import { formatTimeAgo } from "../../utils/date";

const app = getApp<IAppOption>();

Page({
  data: {
    safeTop: 0,
    tags: ["推荐", "关注", "最新", "猫咪", "狗狗"],
    currentTag: "推荐",
    posts: [] as (Post & { timeAgo: string })[],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad() {
    // Get safe area for header
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      safeTop: sysInfo.statusBarHeight
    });

    this.loadPosts(true);
  },

  onPullDownRefresh() {
    this.loadPosts(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts(false);
    }
  },

  async loadPosts(reset = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const page = reset ? 1 : this.data.page + 1;
      const res = await getPosts(page, this.data.pageSize, this.data.currentTag);

      const newPosts = res.list.map(post => ({
        ...post,
        timeAgo: formatTimeAgo(post.createdAt)
      }));

      this.setData({
        posts: reset ? newPosts : [...this.data.posts, ...newPosts],
        page,
        hasMore: newPosts.length === this.data.pageSize,
        loading: false
      });

      if (reset) {
        wx.stopPullDownRefresh();
      }
    } catch (err) {
      console.error(err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onTagTap(e: WechatMiniprogram.TouchEvent) {
    const tag = e.currentTarget.dataset.tag;
    if (tag === this.data.currentTag) return;

    this.setData({
      currentTag: tag,
      posts: [],
      hasMore: true,
      page: 0 // Will be incremented to 1 in loadPosts
    }, () => {
      this.loadPosts(true);
    });
  },

  async onFavoriteTap(e: WechatMiniprogram.TouchEvent) {
    const { id, index } = e.currentTarget.dataset;
    const post = this.data.posts[index];
    const isFavorited = !post.isFavorited;
    const favoriteCount = post.favoriteCount || 0;

    // Optimistic update, prevent negative
    const newCount = isFavorited ? Math.max(0, favoriteCount - 1) : favoriteCount + 1;
    
    const upFavorited = `posts[${index}].isFavorited`;
    const upCount = `posts[${index}].favoriteCount`;
    this.setData({
      [upFavorited]: isFavorited,
      [upCount]: newCount
    });

    try {
      if (isFavorited) {
        await favoritePost(id);
      } else {
        await unfavoritePost(id);
      }
    } catch (err) {
      // Revert on failure
      this.setData({
        [upFavorited]: !isFavorited,
        [upCount]: favoriteCount
      });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  goPostDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/index?id=${id}`
    });
  },

  goCreatePost() {
    wx.navigateTo({
      url: '/pages/post-create/index'
    });
  },

  onMailTap() {
    wx.showToast({
      title: '私信功能开发中',
      icon: 'none'
    });
  }
});
