import { getPetProfile, PetProfile } from "../../../../../services/user";

Page({
  data: {
    petId: '',
    petInfo: null as PetProfile | null
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ petId: options.id });
      this.fetchPetDetail(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async fetchPetDetail(id: string) {
    wx.showLoading({ title: '加载中...' });
    try {
      const petInfo = await getPetProfile(id);
      if (petInfo) {
        this.setData({ petInfo });
      } else {
        wx.showToast({ title: '宠物不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: '获取详情失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onEdit() {
    // 预留编辑页面入口
    wx.showToast({ title: '编辑功能开发中', icon: 'none' });
  }
});