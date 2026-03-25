const { getPetProfile } = require("../../../../../services/user");

Page({
  data: {
    petId: "",
    petInfo: null
  },

  onLoad(options) {
    if (options && options.id) {
      this.setData({ petId: options.id });
      this.fetchPetDetail(options.id);
      return;
    }
    wx.showToast({ title: "参数错误", icon: "none" });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  onShow() {
    if (this.data.petId && wx.getStorageSync("petListNeedRefresh")) {
      this.fetchPetDetail(this.data.petId);
    }
  },

  async fetchPetDetail(id) {
    wx.showLoading({ title: "加载中..." });
    try {
      const petInfo = await getPetProfile(id);
      if (petInfo) {
        this.setData({ petInfo });
      } else {
        wx.showToast({ title: "宠物不存在", icon: "none" });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: "获取详情失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onEdit() {
    wx.navigateTo({ url: `/pages/my/settings/pets/add/index?id=${this.data.petId}` });
  }
});
