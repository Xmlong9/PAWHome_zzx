Page({
  data: {
    statusBarHeight: 0,
    postType: 'image', // 'image' | 'video' | 'qa'
    content: '',
    mediaList: [] as WechatMiniprogram.MediaFile[],
    topic: '',
    location: null as { name: string; address: string } | null,
    pet: '',
    visibility: 'public', // 'public' | 'followers' | 'private'
    visibilityText: '所有人可见'
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: sysInfo.statusBarHeight + 44
    });
  },

  goBack() {
    wx.navigateBack();
  },

  switchType(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type;
    this.setData({ postType: type });
    // Clear media if switching types might cause conflict, or keep it.
    // For simplicity, let's keep media but warn if video vs image conflict arises (wx.chooseMedia handles this).
  },

  onContentInput(e: WechatMiniprogram.Input) {
    this.setData({ content: e.detail.value });
  },

  chooseMedia() {
    const { postType, mediaList } = this.data;
    const count = 9 - mediaList.length;
    
    if (count <= 0) return;

    let mediaType: ('image' | 'video')[] = ['image', 'video'];
    if (postType === 'image') mediaType = ['image'];
    if (postType === 'video') mediaType = ['video'];

    wx.chooseMedia({
      count,
      mediaType,
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          mediaList: [...this.data.mediaList, ...res.tempFiles]
        });
      }
    });
  },

  previewMedia(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.mediaList[index];
    
    if (item.fileType === 'video') {
      // For video, we might want a video player or just use native preview
      // wx.previewMedia is available for both
      wx.previewMedia({
        sources: this.data.mediaList.map(m => ({
          url: m.tempFilePath,
          type: m.fileType
        })),
        current: index
      });
    } else {
      wx.previewImage({
        current: item.tempFilePath,
        urls: this.data.mediaList.filter(m => m.fileType === 'image').map(m => m.tempFilePath)
      });
    }
  },

  deleteMedia(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.mediaList];
    list.splice(index, 1);
    this.setData({ mediaList: list });
  },

  // Mock options
  chooseTopic() {
    wx.showActionSheet({
      itemList: ['#猫猫探头', '#修勾日常', '#今日份可爱', '#养宠经验'],
      success: (res) => {
        this.setData({ topic: ['#猫猫探头', '#修勾日常', '#今日份可爱', '#养宠经验'][res.tapIndex] });
      }
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({ location: res });
      }
    });
  },

  tagPet() {
    wx.showToast({ title: '宠物标记功能开发中', icon: 'none' });
  },

  chooseVisibility() {
    const options = ['所有人可见', '仅关注可见', '仅自己可见'];
    const values = ['public', 'followers', 'private'];
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        this.setData({ 
          visibility: values[res.tapIndex],
          visibilityText: options[res.tapIndex]
        });
      }
    });
  },

  publish() {
    if (!this.data.content && this.data.mediaList.length === 0) {
      wx.showToast({ title: '请输入内容或上传图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    // Mock publish
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '发布成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1500);
  }
});
