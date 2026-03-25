import { getUserProfile, getPetProfile, getPetList, UserProfile, PetProfile } from "../../services/user"

Page({
  data: {
    safeTop: 0,
    userInfo: null as UserProfile | null,
    petInfo: null as PetProfile | null
  },
  onShow() {
    if (wx.getStorageSync('petListNeedRefresh')) {
      this.fetchData();
      wx.removeStorageSync('petListNeedRefresh');
    }
  },
  async fetchData() {
    try {
      const userInfo = await getUserProfile()
      
      // 如果本地缓存了选中的宠物 ID，则获取指定的，否则获取默认第一个
      const currentPetId = wx.getStorageSync('currentPetId') || undefined;
      const petInfo = await getPetProfile(currentPetId);
      
      this.setData({ userInfo, petInfo })
    } catch (e) {
      console.error(e)
    }
  },
  async onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({ safeTop: sys.statusBarHeight })
    this.fetchData();
  },
  goEditProfile() {
    wx.navigateTo({ url: "/pages/my/edit-profile/index" })
  },
  goMyProfile() {
    wx.navigateTo({ url: "/pages/user-profile/index" })
  },
  goFavorites() {
    wx.navigateTo({ url: "/pages/my/favorites/index" })
  },
  goHistory() {
    wx.navigateTo({ url: "/pages/my/history/index" })
  },
  async onSwitchPet() {
    try {
      const pets = await getPetList();
      if (pets.length <= 1) {
        return wx.showToast({ title: '暂无其他宠物', icon: 'none' });
      }
      
      const petNames = pets.map(p => p.name);
      
      wx.showActionSheet({
        itemList: petNames,
        success: async (res) => {
          if (!res.cancel) {
            const selectedPet = pets[res.tapIndex];
            wx.setStorageSync('currentPetId', selectedPet.id);
            this.setData({ petInfo: selectedPet });
          }
        }
      });
    } catch (e) {
      wx.showToast({ title: '获取宠物列表失败', icon: 'none' });
    }
  },
  goSettings() {
    wx.navigateTo({ url: "/pages/my/settings/index" })
  },
  goAddPet() {
    wx.navigateTo({ url: "/pages/my/settings/pets/add/index" })
  },
  goPetDetail() {
    if (this.data.petInfo) {
      wx.navigateTo({ url: `/pages/my/settings/pets/detail/index?id=${this.data.petInfo.id}` })
    }
  }
})
