// community page
import { getPosts, favoritePost, unfavoritePost, Post } from "../../services/posts";
import { listConversations } from "../../services/im";
import { getNotificationUnreadSummary } from "../../services/notifications";
import { formatTimeAgo } from "../../utils/date";
import { navigateToWithTransition } from "../../utils/transition";
import { resolveImageSrc } from "../../utils/mediaCache";

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
    hasMore: true,
    showBlob: false,
    hasUnreadMessage: false
  },

  onLoad() {
    // Get safe area for header
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      safeTop: sysInfo.statusBarHeight
    });

    this.loadPosts(true);
  },

  async onShow() {
    this.setData({ showBlob: true });
    this.startMessageBadgePolling()
    const needRefresh = wx.getStorageSync("community_need_refresh")
    if (needRefresh) {
      wx.setStorageSync("community_need_refresh", false)
      this.loadPosts(true)
    }
  },

  onHide() {
    this.setData({ showBlob: false });
    this.stopMessageBadgePolling()
  },

  onUnload() {
    this.stopMessageBadgePolling()
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

      const startIndex = reset ? 0 : this.data.posts.length
      this.setData({
        posts: reset ? newPosts : [...this.data.posts, ...newPosts],
        page,
        hasMore: newPosts.length === this.data.pageSize,
        loading: false
      }, () => {
        this.hydratePostsMedia(startIndex)
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

  async hydratePostsMedia(startIndex = 0) {
    const posts = this.data.posts || []
    const slice = posts.slice(startIndex)
    const tasks = slice.map((post, i) => this.hydrateOnePostMedia(startIndex + i, post))
    await Promise.allSettled(tasks)
  },

  async hydrateOnePostMedia(index: number, post: any) {
    const updates: Record<string, any> = {}
    const avatarUrl = post?.user?.avatarUrl
    if (typeof avatarUrl === "string" && avatarUrl) {
      const nextAvatar = await resolveImageSrc(avatarUrl)
      if (nextAvatar && nextAvatar !== avatarUrl) {
        updates[`posts[${index}].user.avatarUrl`] = nextAvatar
      }
    }
    const firstImage = post?.images?.[0]
    if (typeof firstImage === "string" && firstImage) {
      const nextImage = await resolveImageSrc(firstImage)
      if (nextImage && nextImage !== firstImage) {
        updates[`posts[${index}].images[0]`] = nextImage
      }
    }
    if (Object.keys(updates).length > 0) {
      this.setData(updates)
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

    const newCount = isFavorited ? favoriteCount + 1 : Math.max(0, favoriteCount - 1);
    
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
    navigateToWithTransition(`/pages/post-detail/index?id=${id}`);
  },

  goUserProfile(e: WechatMiniprogram.TouchEvent) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      navigateToWithTransition(`/pages/user-profile/index?id=${userId}`);
    }
  },

  goCreatePost() {
    navigateToWithTransition('/pages/post-create/index');
  },

  onMailTap() {
    navigateToWithTransition('/pages/messages/index');
  },

  startMessageBadgePolling() {
    const self = this as any
    if (self._badgeTimer) clearInterval(self._badgeTimer)
    this.refreshMessageBadge()
    self._badgeTimer = setInterval(() => {
      this.refreshMessageBadge()
    }, 15000)
  },

  stopMessageBadgePolling() {
    const self = this as any
    if (!self._badgeTimer) return
    clearInterval(self._badgeTimer)
    self._badgeTimer = null
  },

  async refreshMessageBadge() {
    const self = this as any
    if (self._refreshingBadge) return
    self._refreshingBadge = true
    try {
      const [summary, conversations] = await Promise.all([
        getNotificationUnreadSummary(),
        listConversations()
      ])
      const dmUnread = conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0)
      const total = summary.total + dmUnread
      this.setData({ hasUnreadMessage: total > 0 })
      wx.setStorageSync("community_message_unread_total", total)
    } catch {
      const cached = Number(wx.getStorageSync("community_message_unread_total") || 0)
      this.setData({ hasUnreadMessage: cached > 0 })
    } finally {
      self._refreshingBadge = false
    }
  },

  goSearch() {
    navigateToWithTransition("/pages/search/index?type=community");
  }
});
