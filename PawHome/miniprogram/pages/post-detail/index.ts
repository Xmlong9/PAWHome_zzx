import {
  getPost,
  likePost,
  unlikePost,
  favoritePost,
  unfavoritePost,
  updatePost,
  deletePost,
  getPostShareTargets,
  getPostShareLink,
  pinPost,
  ShareTarget,
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
import { createConversation, sendMessage } from "../../services/im";
import { trackEvent } from "../../services/analytics";
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
    showActionPanel: false,
    shareTargets: [] as (ShareTarget & { selected?: boolean })[],
    shareGroup: "all" as "all" | "mutual" | "following" | "follower",
    selectedShareIds: [] as string[],
    sharePath: "",
    shareShortUrl: "",
    
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
    if (!this.data.post) return
    trackEvent("post_action_open", { isSelf: this.data.isSelfPost })
    this.setData({ showActionPanel: true })
    await this.prepareShareData()
  },

  closeActionPanel() {
    this.setData({ showActionPanel: false })
  },

  stopPanelTap() {},

  async prepareShareData() {
    if (!this.data.post) return
    try {
      const [targets, link] = await Promise.all([
        getPostShareTargets(this.data.post.id),
        getPostShareLink(this.data.post.id)
      ])
      const list = Array.isArray((targets as any)?.list) ? (targets as any).list : []
      const normalizedTargets: ShareTarget[] = list
        .map((t: any) => {
          const id = t?.id ?? t?.userId ?? t?._id ?? t?.uid
          const nickname = t?.nickname ?? t?.name ?? t?.username ?? ""
          const avatarUrl = t?.avatarUrl ?? t?.avatar ?? t?.avatar_url ?? ""
          const group = (t?.group === "mutual" || t?.group === "following" || t?.group === "follower")
            ? t.group
            : "follower"
          return {
            id: id == null ? "" : String(id),
            nickname: String(nickname),
            avatarUrl: String(avatarUrl),
            group
          }
        })
        .filter((t: ShareTarget) => Boolean(t.id))
      const selected = new Set((this.data.selectedShareIds || []).map((v) => String(v)))
      this.setData({
        shareTargets: normalizedTargets.map((t) => ({ ...t, selected: selected.has(t.id) })),
        sharePath: link.path,
        shareShortUrl: link.shortUrl
      })
    } catch {
      wx.showToast({ title: "分享数据加载失败", icon: "none" })
    }
  },

  onShareGroupTap(e: WechatMiniprogram.TouchEvent) {
    const group = e.currentTarget.dataset.group as "all" | "mutual" | "following" | "follower"
    this.setData({ shareGroup: group })
  },

  onToggleShareTarget(e: WechatMiniprogram.TouchEvent) {
    const rawId = (e.currentTarget.dataset as any)?.id
    const id = rawId == null ? "" : String(rawId)
    if (!id) return
    const selected = new Set((this.data.selectedShareIds || []).map((v) => String(v)))
    if (selected.has(id)) {
      selected.delete(id)
    } else {
      selected.add(id)
    }
    this.setData({
      selectedShareIds: Array.from(selected),
      shareTargets: (this.data.shareTargets || []).map((t) => ({
        ...(t as any),
        id: t?.id == null ? "" : String(t.id),
        selected: selected.has(String(t?.id))
      }))
    })
  },

  async onSendInternalShare() {
    if (!this.data.post) return
    if (this.data.selectedShareIds.length === 0) {
      wx.showToast({ title: "请先选择分享对象", icon: "none" })
      return
    }
    try {
      const post = this.data.post
      const content = `【分享帖子】${(post.content || "").slice(0, 80)} ${this.data.shareShortUrl || ""}`
      await Promise.all(
        this.data.selectedShareIds.map(async (peerId) => {
          const conv = await createConversation(peerId)
          await sendMessage(conv.id, "text", content)
        })
      )
      trackEvent("post_share_internal", { count: this.data.selectedShareIds.length })
      wx.showToast({ title: "已分享", icon: "success" })
      this.setData({ selectedShareIds: [] })
    } catch {
      wx.showToast({ title: "分享失败，请检查网络", icon: "none" })
    }
  },

  async onCopyShareLink() {
    if (!this.data.shareShortUrl && this.data.post) {
      await this.prepareShareData()
    }
    if (!this.data.shareShortUrl) {
      wx.showToast({ title: "链接生成失败", icon: "none" })
      return
    }
    wx.setClipboardData({
      data: this.data.shareShortUrl,
      success: () => {
        trackEvent("post_copy_link")
        wx.showToast({ title: "链接已复制", icon: "success" })
      },
      fail: () => wx.showToast({ title: "复制失败", icon: "none" })
    })
  },

  onShareToWxFriend() {
    trackEvent("post_share_wx_friend")
  },

  onShareToTimeline() {
    try {
      wx.showShareMenu({ menus: ["shareAppMessage", "shareTimeline"] as any })
      trackEvent("post_share_timeline")
      wx.showToast({ title: "请点击右上角分享到朋友圈", icon: "none" })
    } catch {
      wx.showToast({ title: "当前微信版本不支持", icon: "none" })
    }
  },

  async onSaveImagesTap() {
    const imgs = this.data.post?.images || []
    if (imgs.length === 0) {
      wx.showToast({ title: "该帖子没有图片", icon: "none" })
      return
    }
    try {
      const setting = await new Promise<WechatMiniprogram.GetSettingSuccessCallbackResult>((resolve, reject) =>
        wx.getSetting({ success: resolve, fail: reject })
      )
      if (!setting.authSetting["scope.writePhotosAlbum"]) {
        await new Promise<void>((resolve, reject) =>
          wx.authorize({
            scope: "scope.writePhotosAlbum",
            success: () => resolve(),
            fail: reject
          })
        )
      }
    } catch {
      wx.showToast({ title: "请先开启相册权限", icon: "none" })
      return
    }

    let success = 0
    for (const img of imgs) {
      try {
        const tmp = await new Promise<string>((resolve, reject) =>
          wx.downloadFile({
            url: img,
            success: (res) => (res.statusCode === 200 ? resolve(res.tempFilePath) : reject(new Error("download"))),
            fail: reject
          })
        )
        await new Promise<void>((resolve, reject) =>
          wx.saveImageToPhotosAlbum({
            filePath: tmp,
            success: () => resolve(),
            fail: reject
          })
        )
        success += 1
      } catch {
      }
    }
    trackEvent("post_save_images", { total: imgs.length, success })
    if (success > 0) {
      wx.showToast({ title: `已保存${success}张`, icon: "success" })
    } else {
      wx.showToast({ title: "保存失败", icon: "none" })
    }
  },

  async onPinPostTap() {
    if (!this.data.post || !this.data.isSelfPost) return
    const post = this.data.post
    try {
      const next = !Boolean(post.isPinned)
      await pinPost(post.id, next)
      const latest = await getPost(post.id)
      this.setData({
        post: {
          ...latest,
          timeAgo: formatTimeAgo(latest.createdAt)
        }
      })
      wx.setStorageSync("community_need_refresh", true)
      trackEvent("post_pin_toggle", { isPinned: next })
      wx.showToast({ title: next ? "已置顶" : "已取消置顶", icon: "success" })
    } catch (e: any) {
      const msg = String(e?.message || "")
      wx.showToast({ title: msg.includes("limit") ? "置顶数量已达上限" : "置顶失败", icon: "none" })
    }
  },

  onShareAppMessage() {
    const post = this.data.post
    const title = post?.content?.slice(0, 24) || "分享一条帖子"
    return {
      title,
      path: this.data.sharePath || `/pages/post-detail/index?id=${post?.id || ""}`,
      imageUrl: post?.images?.[0] || ""
    }
  },

  onShareTimeline() {
    const post = this.data.post
    return {
      title: post?.content?.slice(0, 24) || "分享一条帖子",
      query: `id=${post?.id || ""}`
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
      const visibilityMap: Record<string, "public" | "followers" | "private"> = {
        所有人可见: "public",
        仅粉丝可见: "followers",
        仅自己可见: "private"
      }
      const idx = await new Promise<number>((resolve, reject) =>
        wx.showActionSheet({
          itemList: ["所有人可见", "仅粉丝可见", "仅自己可见"],
          success: (res) => resolve(res.tapIndex),
          fail: reject
        })
      )
      const visibility = [visibilityMap["所有人可见"], visibilityMap["仅粉丝可见"], visibilityMap["仅自己可见"]][idx]
      const nextPost = await updatePost(post.id, { content: nextContent, visibility })
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
      this.closeActionPanel()
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
      this.closeActionPanel()
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
