import { getUserSettings, updateUserSettings, UserSettings, getPetList } from "../../../services/user";

Page({
  data: {
    settings: {
      pushNotice: true,
      interactNotice: true,
      homeAccess: "仅关注者可见",
      commentAccess: "所有人"
    } as UserSettings,
    petCount: 0 
  },

  onLoad() {
    this.fetchSettings();
    this.fetchPetCount();
  },

  async fetchPetCount() {
    try {
      const pets = await getPetList();
      this.setData({ petCount: pets.length });
    } catch (err) {
      console.error('获取宠物列表失败', err);
    }
  },

  async fetchSettings() {
    try {
      const settings = await getUserSettings();
      this.setData({ settings });
    } catch (err) {
      console.error('获取设置失败', err);
    }
  },

  async onNoticeChange(e: any) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    // 乐观更新 UI
    this.setData({
      [`settings.${field}`]: value
    });

    try {
      await updateUserSettings({ [field]: value });
    } catch (err) {
      // 失败回滚
      wx.showToast({ title: '设置失败', icon: 'error' });
      this.setData({
        [`settings.${field}`]: !value
      });
    }
  },

  async onChangeHomeAccess() {
    const itemList = ['所有人可见', '仅关注者可见', '仅自己可见'];
    wx.showActionSheet({
      itemList,
      success: async (res) => {
        if (!res.cancel) {
          const selected = itemList[res.tapIndex] as any;
          this.setData({ 'settings.homeAccess': selected });
          await updateUserSettings({ homeAccess: selected });
        }
      }
    });
  },

  async onChangeCommentAccess() {
    const itemList = ['所有人', '仅关注者', '关闭评论'];
    wx.showActionSheet({
      itemList,
      success: async (res) => {
        if (!res.cancel) {
          const selected = itemList[res.tapIndex] as any;
          this.setData({ 'settings.commentAccess': selected });
          await updateUserSettings({ commentAccess: selected });
        }
      }
    });
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/my/settings/address/index' });
  },

  goPassword() {
    wx.navigateTo({ url: '/pages/my/settings/password/index' });
  },

  goPhone() {
    wx.navigateTo({ url: '/pages/my/settings/phone/index' });
  },

  goPets() {
    wx.navigateTo({ url: '/pages/my/settings/pets/index' });
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          wx.showToast({ title: '已退出', icon: 'success' })
          // 实际应该清除 token 等缓存
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1500)
        }
      }
    })
  }
})