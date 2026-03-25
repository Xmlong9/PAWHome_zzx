import { getBanners, getCommunityCards } from "../../services/banners";

Page({
  data: {
    swiperList: [
      { src: '/assets/images/home/slideshow1@1x.png' },
      { src: '/assets/images/home/slideshow1@1x.png' },
      { src: '/assets/images/home/slideshow1@1x.png' }
    ],
    current: 0,
    indicatorBars: [],
    safeTop: 0,
    promo: null as any,
    communityCard: null as any,
    showBlob: false
  },
  onShow() {
    this.setData({ showBlob: true });
  },
  onHide() {
    this.setData({ showBlob: false });
  },
  goSearch() {
    wx.navigateTo({ url: "/pages/search/index?type=community" });
  },

  scanCode() {
    wx.scanCode({
      success: (res) => {
        wx.showToast({ title: '扫码成功', icon: 'none' });
      }
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        if (res.name) {
          this.setData({ location: res.name });
        }
      }
    });
  },
  goCommunity(){ wx.switchTab({ url: '/pages/community/index' }); },
  goShop(){ wx.switchTab({ url: '/pages/shop/index' }); },
  goService(){ wx.navigateTo({ url: '/pages/service/index' }); },
  goMy(){ wx.switchTab({ url: '/pages/my/index' }); },
  goHome(){ wx.switchTab({ url: '/pages/home/index' }); },
  goServiceVaccine(){ wx.navigateTo({ url: '/pages/service/index?type=vaccine' }); },
  goServiceBeauty(){ wx.navigateTo({ url: '/pages/service/index?type=beauty' }); },
  goServiceMedical(){ wx.navigateTo({ url: '/pages/service/index?type=medical' }); },
  goServiceFoster(){ wx.navigateTo({ url: '/pages/service/index?type=foster' }); }
  ,
  onSwiperChange(e: any){
    this.setData({ current: e.detail.current })
  },
  onLoad(){
    const bars = Array.from({ length: this.data.swiperList.length }, (_, i) => i)
    const info = wx.getSystemInfoSync()
    const safeTop = (info.statusBarHeight || 0) + 8
    this.setData({ indicatorBars: bars, safeTop })
    getBanners("home_promo").then(list => {
      if (list && list.length) this.setData({ promo: list[0] })
    }).catch(() => {})
    getBanners("home_community").then(list => {
      if (list && list.length) this.setData({ communityCard: list[0] })
    }).catch(() => {})
    getCommunityCards(1,1).then(list => {
      if (list && list.length && !this.data.communityCard) this.setData({ communityCard: { imageUrl: list[0].imageUrl, title: list[0].title, badge: list[0].badge } })
    }).catch(() => {})
  }
});
