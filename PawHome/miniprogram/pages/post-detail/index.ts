import {
  getPost,
  likePost,
  unlikePost,
  favoritePost,
  unfavoritePost,
  updatePost,
  deletePost,
  Post
} from "../../services/posts";
import {
  getComments,
  addComment,
  likeComment,
  unlikeComment,
  deleteComment,
  pinComment,
  Comment
} from "../../services/comments";
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
    currentUserId: "",
    
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
    const currentUserId = wx.getStorageSync("userId") || ""
    if (options.id) {
      this.loadPost(options.id);
      this.loadComments(options.id);
    }
    
    // Get safe area
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth || 375
    this.setData({
      currentUserId,
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
        canDelete: c.userId === this.data.currentUserId || this.data.isSelfPost,
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

  async onPostActionTap() {
    if (!this.data.post || !this.data.isSelfPost) return
    try {
      const action = await new Promise<number>((resolve, reject) => {
        wx.showActionSheet({
          itemList: ["编辑帖子", "删除帖子"],
          success: (res) => resolve(res.tapIndex),
          fail: reject
        })
      })
      if (action === 0) {
        await this.onEditPostTap()
        return
      }
      await this.onDeletePostTap()
    } catch {
    }
  },

  async onEditPostTap() {
    if (!this.data.post || !this.data.isSelfPost) return
    const post = this.data.post
    try {
      const modalRes = await new Promise<WechatMiniprogram.ShowModalSuccessCallbackResult>(
        (resolve, reject) => {
          wx.showModal({
            title: "编辑帖子",
            editable: true,
            content: post.content,
            placeholderText: "请输入帖子内容",
            success: resolve,
            fail: reject
          })
        }
      )
      if (!modalRes.confirm) return
      const nextContent = (modalRes.content || "").trim()
      if (!nextContent) {
        wx.showToast({ title: "内容不能为空", icon: "none" })
        return
      }
      wx.showLoading({ title: "保存中" })
      const nextPost = await updatePost(post.id, { content: nextContent })
      this.setData({
        post: {
          ...nextPost,
          timeAgo: formatTimeAgo(nextPost.createdAt)
        }
      })
      wx.setStorageSync("community_need_refresh", true)
      wx.setStorageSync("user_profile_need_refresh", true)
      wx.hideLoading()
      wx.showToast({ title: "已保存", icon: "success" })
    } catch {
      wx.hideLoading()
      wx.showToast({ title: "保存失败", icon: "none" })
    }
  },

  async onDeletePostTap() {
    if (!this.data.post || !this.data.isSelfPost) return
    try {
      const modalRes = await new Promise<WechatMiniprogram.ShowModalSuccessCallbackResult>(
        (resolve, reject) => {
          wx.showModal({
            title: "删除帖子",
            content: "删除后不可恢复，是否继续？",
            confirmColor: "#ff4d4f",
            success: resolve,
            fail: reject
          })
        }
      )
      if (!modalRes.confirm) return
      wx.showLoading({ title: "删除中" })
      await deletePost(this.data.post.id)
      wx.setStorageSync("community_need_refresh", true)
      wx.setStorageSync("user_profile_need_refresh", true)
      wx.hideLoading()
      wx.showToast({ title: "已删除", icon: "success" })
      setTimeout(() => this.goBack(), 200)
    } catch {
      wx.hideLoading()
      wx.showToast({ title: "删除失败", icon: "none" })
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

  async onDeleteCommentTap(e: WechatMiniprogram.TouchEvent) {
    if (!this.data.post) return
    const id = e.currentTarget.dataset.id as string
    const item = e.currentTarget.dataset.item as (Comment & { canDelete?: boolean })
    if (!item?.canDelete) return
    try {
      const modalRes = await new Promise<WechatMiniprogram.ShowModalSuccessCallbackResult>(
        (resolve, reject) => {
          wx.showModal({
            title: "删除评论",
            content: "确定删除这条评论吗？",
            confirmColor: "#ff4d4f",
            success: resolve,
            fail: reject
          })
        }
      )
      if (!modalRes.confirm) return
      await deleteComment(id)
      await this.loadComments(this.data.post.id)
      const post = await getPost(this.data.post.id)
      this.setData({
        post: {
          ...post,
          timeAgo: formatTimeAgo(post.createdAt)
        }
      })
      wx.setStorageSync("community_need_refresh", true)
      wx.showToast({ title: "已删除", icon: "success" })
    } catch {
      wx.showToast({ title: "删除失败", icon: "none" })
    }
  },

  async onPinCommentTap(e: WechatMiniprogram.TouchEvent) {
    if (!this.data.post || !this.data.isSelfPost) return
    const id = e.currentTarget.dataset.id as string
    const isPinned = Boolean(e.currentTarget.dataset.ispinned)
    try {
      await pinComment(id, !isPinned)
      await this.loadComments(this.data.post.id)
      wx.showToast({ title: !isPinned ? "已置顶" : "已取消置顶", icon: "success" })
    } catch {
      wx.showToast({ title: "操作失败", icon: "none" })
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
      await addComment(this.data.post.id, content, parentId);
      await this.loadComments(this.data.post.id)
      const post = await getPost(this.data.post.id)
      this.setData({
        inputValue: "",
        replyTo: null,
        post: {
          ...post,
          timeAgo: formatTimeAgo(post.createdAt)
        }
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
