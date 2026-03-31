import { deleteAddress, listAddresses, setDefaultAddress, UserAddress } from "../../../../services/shop";

type GeoInfo = { latitude: number; longitude: number; name?: string; address?: string }

const GEO_STORAGE_KEY = "address_geo_map"
const CHECKOUT_SELECTED_KEY = "checkout_selected_address"

function readGeoMap(): Record<string, GeoInfo> {
  try {
    const raw = wx.getStorageSync(GEO_STORAGE_KEY)
    if (!raw) return {}
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw
    return obj && typeof obj === "object" ? (obj as Record<string, GeoInfo>) : {}
  } catch {
    return {}
  }
}

Page({
  data: {
    addresses: [] as Array<UserAddress & Partial<GeoInfo>>,
    mode: "manage" as "manage" | "select",
    selectedId: "",
    mapLatitude: 30.2741,
    mapLongitude: 120.1551,
    mapMarkers: [] as WechatMiniprogram.MapMarker[]
  },
  onLoad(options: Record<string, string | undefined>) {
    const mode = options.mode === "select" ? "select" : "manage"
    const selectedId = options.selectedId || ""
    this.setData({ mode, selectedId })
    this.fetchAddresses();
  },
  onShow() {
    if (wx.getStorageSync("addressNeedRefresh")) {
      wx.removeStorageSync("addressNeedRefresh")
      this.fetchAddresses()
    }
  },
  async fetchAddresses() {
    wx.showLoading({ title: '加载中...' });
    try {
      const addresses = await listAddresses();
      const geoMap = readGeoMap()
      const next = (addresses || []).map((a) => ({ ...a, ...(geoMap[a.id] || {}) }))
      const picked = next.find((a) => a.isDefault) || next[0]
      if (picked && typeof picked.latitude === "number" && typeof picked.longitude === "number") {
        this.setData({
          addresses: next,
          mapLatitude: picked.latitude,
          mapLongitude: picked.longitude,
          mapMarkers: [{ id: 1, latitude: picked.latitude, longitude: picked.longitude }]
        })
      } else {
        this.setData({ addresses: next, mapMarkers: [] })
      }
    } catch (err) {
      wx.showToast({ title: '获取地址失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
  onAdd() {
    wx.navigateTo({ url: "/pages/my/settings/address/edit/index" })
  },
  onEdit(e: any) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return
    wx.navigateTo({ url: `/pages/my/settings/address/edit/index?id=${encodeURIComponent(id)}` })
  },
  onTapItem(e: any) {
    const id = e.currentTarget.dataset.id as string
    const item = this.data.addresses.find((a) => a.id === id)
    if (!item) return
    if (this.data.mode === "select") {
      wx.setStorageSync(CHECKOUT_SELECTED_KEY, item)
      wx.navigateBack({
        delta: 1,
        fail: () => wx.switchTab({ url: "/pages/my/index" })
      })
      return
    }
    wx.navigateTo({ url: `/pages/my/settings/address/edit/index?id=${encodeURIComponent(id)}` })
  },
  async onSetDefault(e: any) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return
    wx.showLoading({ title: "设置中..." })
    try {
      await setDefaultAddress(id)
      wx.setStorageSync("addressNeedRefresh", true)
      await this.fetchAddresses()
      wx.showToast({ title: "已设为默认" })
    } catch {
      wx.showToast({ title: "设置失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  },
  onDelete(e: any) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return
    wx.showModal({
      title: "删除地址",
      content: "确定删除该收货地址吗？",
      confirmText: "删除",
      confirmColor: "#ef4444",
      success: async (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: "删除中..." })
        try {
          await deleteAddress(id)
          wx.setStorageSync("addressNeedRefresh", true)
          await this.fetchAddresses()
          wx.showToast({ title: "已删除" })
        } catch {
          wx.showToast({ title: "删除失败", icon: "none" })
        } finally {
          wx.hideLoading()
        }
      }
    })
  }
});
