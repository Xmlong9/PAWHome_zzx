import { getCommunityCards } from "../../services/banners";
import { getBaseUrl } from "../../config/env";

const HOME_PUSH_FALLBACK_MEDIA = ["推送1.jpg", "推送2.jpg", "推送3.jpg", "推送4.jpg", "推送5.jpg"]

function getApiOrigin(): string {
  const base = getBaseUrl()
  return base.split("/").slice(0, 3).join("/")
}

function toAbsoluteUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:/i.test(url)) return url
  if (/^wxfile:\/\//i.test(url)) return url
  if (url.startsWith("/assets/")) return url
  const origin = getApiOrigin()
  if (url.startsWith("/")) return origin + url
  return origin + "/" + url
}

function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h >>> 0
}

function pickHomePushFallbackImageUrl(id: string): string {
  const origin = getApiOrigin()
  const idx = HOME_PUSH_FALLBACK_MEDIA.length ? hashString(id) % HOME_PUSH_FALLBACK_MEDIA.length : 0
  const name = HOME_PUSH_FALLBACK_MEDIA[idx] || ""
  return `${origin}/media/${encodeURIComponent(name)}`
}

function getShopBannerUrl(): string {
  return `${getApiOrigin()}/media/shop_banner.png`
}

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
    promoFallbackUrl: "",
    promoLocalFallbackUrl: "/assets/images/home/advertise@1x.png",
    hotPosts: [] as any[],
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
  openHotPost(e: any) {
    const url = e.currentTarget?.dataset?.url
    if (!url) return
    wx.navigateTo({ url })
  },
  onSwiperChange(e: any){
    this.setData({ current: e.detail.current })
  },
  onLoad(){
    const bars = Array.from({ length: this.data.swiperList.length }, (_, i) => i)
    const info = wx.getSystemInfoSync()
    const safeTop = (info.statusBarHeight || 0) + 8
    const shopBanner = getShopBannerUrl()
    this.setData({
      indicatorBars: bars,
      safeTop,
      promo: { imageUrl: shopBanner },
      promoFallbackUrl: shopBanner
    })
    getCommunityCards(1, 4).then(list => {
      const items = (list || []).map(item => ({
        ...item,
        coverUrl: item.imageUrl ? item.imageUrl : pickHomePushFallbackImageUrl(String(item.id || ""))
      }))
      if (items.length) this.setData({ hotPosts: items })
    }).catch(() => {})
  }
  ,
  onPromoError() {
    this.setData({ promo: null, promoFallbackUrl: this.data.promoLocalFallbackUrl })
  }
});
