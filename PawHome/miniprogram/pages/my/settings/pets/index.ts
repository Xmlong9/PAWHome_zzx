import { getPetList, PetProfile } from "../../../../services/user";

Page({
  data: {
    pets: [] as PetProfile[]
  },
  onLoad() {
    this.fetchPets();
  },
  onShow() {
    if (wx.getStorageSync('petListNeedRefresh')) {
      this.fetchPets();
      wx.removeStorageSync('petListNeedRefresh');
    }
  },
  async fetchPets() {
    wx.showLoading({ title: '加载中...' });
    try {
      const pets = await getPetList();
      this.setData({ pets });
    } catch (err) {
      wx.showToast({ title: '获取宠物失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
  onAdd() {
    wx.navigateTo({ url: '/pages/my/settings/pets/add/index' });
  },
  onEdit(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `编辑宠物 ${id}`, icon: 'none' });
  },
  goPetDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/my/settings/pets/detail/index?id=${id}` });
  }
});
