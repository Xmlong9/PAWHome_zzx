import { getPost, likePost, unlikePost, favoritePost, unfavoritePost, Post } from "../../services/posts";
import { getComments, addComment, likeComment, unlikeComment, Comment } from "../../services/comments";
import { followUser, unfollowUser } from "../../services/user";
import { formatTimeAgo } from "../../utils/date";

const app = getApp<IAppOption>();

Page({
  data: {
    post: null as (Post & { timeAgo: string }) | null,
    isSelfPost: false,
    mediaHeight: 300,
    mediaBgColor: "#ffffff",
    imageHeights: [] as number[],
    comments: [] as (Comment & { timeAgo: string })[],
    totalComments: 0,
    loadingComments: false,
    
    // UI state
    currentTab: 'content', // 'content' | 'comments'
    swiperCurrent: 0,
    statusBarHeight: 0,
    navBarHeight: 44,
    navHeight: 44,
    safeAreaBottom: 0,

    // Input related
    inputValue: "",
    inputFocus: false,
    replyTo: null as Comment | null, // The comment being replied to
  },

  onLoad(options: { id: string }) {
    if (options.id) {
      this.loadPost(options.id);
      this.loadComments(options.id);
    }
    
    // Get safe area
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth || 375
    this.setData({
      safeAreaTop: sysInfo.statusBarHeight,
      safeAreaBottom: sysInfo.screenHeight - sysInfo.safeArea.bottom,
      mediaHeight: Math.round(windowWidth * 0.72)
    });
  },

  onTabChange(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  onSwiperChange(e: WechatMiniprogram.SwiperChange) {
    const current = e.detail.current
    const heights = this.data.imageHeights || []
    const images = this.data.post?.images || []
    const currentUrl = images[current] || ""
    this.setData({
      swiperCurrent: current,
      mediaHeight: heights[current] || this.data.mediaHeight,
      mediaBgColor: this.getImageBgColor(currentUrl)
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/home/index'
      });
    }
  },

  goUserProfile(e: WechatMiniprogram.TouchEvent) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({
        url: `/pages/user-profile/index?id=${userId}`
      });
    }
  },

  async loadPost(id: string) {
    try {
      const post = await getPost(id);
      const myUserId = wx.getStorageSync("userId") || ""
      const firstImage = post.images?.[0] || ""
      this.setData({
        isSelfPost: !!myUserId && post.userId === myUserId,
        imageHeights: [],
        mediaBgColor: this.getImageBgColor(firstImage),
        post: {
          ...post,
          timeAgo: formatTimeAgo(post.createdAt)
        }
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '帖子加载失败', icon: 'none' });
    }
  },

  getImageBgColor(url: string) {
    return "#ffffff"
  },

  onImageLoad(e: WechatMiniprogram.ImageLoad) {
    const { width, height } = e.detail || { width: 0, height: 0 }
    const index = Number((e.currentTarget as any)?.dataset?.index ?? -1)
    if (!width || !height || index < 0) return
    const windowWidth = wx.getSystemInfoSync().windowWidth || 375
    const rawHeight = Math.round((windowWidth * height) / width)
    const minHeight = Math.round(windowWidth * 0.45)
    const maxHeight = Math.round(windowWidth * 1.35)
    const fitHeight = Math.max(minHeight, Math.min(maxHeight, rawHeight))
    const nextHeights = [...(this.data.imageHeights || [])]
    nextHeights[index] = fitHeight
    const nextState: Record<string, any> = { imageHeights: nextHeights }
    if (index === this.data.swiperCurrent) {
      nextState.mediaHeight = fitHeight
      const images = this.data.post?.images || []
      nextState.mediaBgColor = this.getImageBgColor(images[index] || "")
    }
    this.setData(nextState)
  },

  async loadComments(postId: string) {
    this.setData({ loadingComments: true });
    try {
      const res = await getComments(postId);
      const comments = res.list.map(c => ({
        ...c,
        timeAgo: formatTimeAgo(c.createdAt)
      }));
      this.setData({
        comments,
        totalComments: res.total,
        loadingComments: false
      });
    } catch (err) {
      console.error(err);
      this.setData({ loadingComments: false });
    }
  },

  // Interactions
  async onFollowTap() {
    if (!this.data.post || this.data.isSelfPost) return;
    const { userId, isFollowed } = this.data.post;
    
    // Optimistic update
    this.setData({ 'post.isFollowed': !isFollowed });
    
    try {
      if (isFollowed) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (err) {
      // Revert
      this.setData({ 'post.isFollowed': isFollowed });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async onLikePostTap() {
    if (!this.data.post) return;
    const { id, isLiked, likeCount } = this.data.post;
    
    this.setData({ 
      'post.isLiked': !isLiked,
      'post.likeCount': isLiked ? likeCount - 1 : likeCount + 1
    });

    try {
      if (isLiked) {
        await unlikePost(id);
      } else {
        await likePost(id);
      }
      wx.setStorageSync("community_need_refresh", true)
      wx.setStorageSync("user_profile_need_refresh", true)
    } catch (err) {
      this.setData({ 
        'post.isLiked': isLiked,
        'post.likeCount': likeCount
      });
    }
  },

  async onFavoriteTap() {
    if (!this.data.post) return;
    const { id, isFavorited, favoriteCount } = this.data.post;
    
    // Ensure count doesn't go below 0
    const newCount = isFavorited ? Math.max(0, favoriteCount - 1) : favoriteCount + 1;

    this.setData({ 
      'post.isFavorited': !isFavorited,
      'post.favoriteCount': newCount
    });

    try {
      if (isFavorited) {
        await unfavoritePost(id);
      } else {
        await favoritePost(id);
      }
      wx.setStorageSync("community_need_refresh", true)
      wx.setStorageSync("user_profile_need_refresh", true)
    } catch (err) {
      this.setData({ 
        'post.isFavorited': isFavorited,
        'post.favoriteCount': favoriteCount
      });
    }
  },

  async onLikeCommentTap(e: WechatMiniprogram.TouchEvent) {
    const { index, id } = e.currentTarget.dataset;
    const comment = this.data.comments[index];
    const { isLiked, likeCount } = comment;

    const key = `comments[${index}]`;
    this.setData({
      [`${key}.isLiked`]: !isLiked,
      [`${key}.likeCount`]: isLiked ? likeCount - 1 : likeCount + 1
    });

    try {
      if (isLiked) {
        await unlikeComment(id);
      } else {
        await likeComment(id);
      }
    } catch (err) {
      this.setData({
        [`${key}.isLiked`]: isLiked,
        [`${key}.likeCount`]: likeCount
      });
    }
  },

  // Comment Input
  onReplyTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      replyTo: item,
      inputFocus: true
    });
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ inputValue: e.detail.value });
  },

  onInputBlur() {
    // Optional: clear replyTo if needed, but usually kept until sent or manually cleared
    // this.setData({ inputFocus: false });
  },

  async onSend() {
    const content = this.data.inputValue.trim();
    if (!content) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    
    if (!this.data.post) return;

    wx.showLoading({ title: '发送中' });
    
    try {
      const parentId = this.data.replyTo ? this.data.replyTo.id : undefined;
      const newComment = await addComment(this.data.post.id, content, parentId);
      
      // Add to list locally
      const commentWithTime = {
        ...newComment,
        timeAgo: '刚刚',
        replyTo: this.data.replyTo ? { 
          userId: this.data.replyTo.userId, 
          nickname: this.data.replyTo.user.nickname 
        } : undefined
      };

      this.setData({
        comments: [commentWithTime, ...this.data.comments],
        totalComments: this.data.totalComments + 1,
        inputValue: "",
        replyTo: null,
        'post.commentCount': (this.data.post.commentCount || 0) + 1
      });
      wx.setStorageSync("community_need_refresh", true)
      
      wx.hideLoading();
      wx.showToast({ title: '发送成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  previewImage(e: WechatMiniprogram.TouchEvent) {
    const current = e.currentTarget.dataset.current;
    if (this.data.post && this.data.post.images) {
      wx.previewImage({
        current,
        urls: this.data.post.images
      });
    }
  }
});
