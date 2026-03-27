import { createAddress, deleteAddress, getAddressById, setDefaultAddress, updateAddress, UserAddress } from "../../../../../services/shop"
import { isPhone } from "../../../../../utils/validators"

type GeoInfo = { latitude: number; longitude: number; name?: string; address?: string }

const GEO_STORAGE_KEY = "address_geo_map"

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

function writeGeoMap(map: Record<string, GeoInfo>) {
  wx.setStorageSync(GEO_STORAGE_KEY, JSON.stringify(map))
}

Page({
  data: {
    id: "",
    name: "",
    phone: "",
    region: [] as string[],
    regionText: "",
    detail: "",
    isDefault: false,
    mapLatitude: 30.2741,
    mapLongitude: 120.1551,
    mapMarkers: [] as WechatMiniprogram.MapMarker[],
    geoName: "",
    geoAddress: ""
  },
  async onLoad(options: Record<string, string | undefined>) {
    const id = options.id || ""
    this.setData({ id })
    if (!id) return
    try {
      const addr = await getAddressById(id)
      if (!addr) return
      const region = [addr.province, addr.city, addr.district]
      const geo = readGeoMap()[id]
      const latitude = typeof geo?.latitude === "number" ? geo.latitude : this.data.mapLatitude
      const longitude = typeof geo?.longitude === "number" ? geo.longitude : this.data.mapLongitude
      this.setData({
        name: addr.name,
        phone: addr.phone,
        region,
        regionText: region.join(" "),
        detail: addr.detail,
        isDefault: !!addr.isDefault,
        mapLatitude: latitude,
        mapLongitude: longitude,
        mapMarkers: typeof geo?.latitude === "number" && typeof geo?.longitude === "number"
          ? [{ id: 1, latitude: geo.latitude, longitude: geo.longitude }]
          : [],
        geoName: geo?.name || "",
        geoAddress: geo?.address || ""
      })
    } catch {
    }
  },
  onName(e: any) {
    this.setData({ name: e.detail.value })
  },
  onPhone(e: any) {
    this.setData({ phone: e.detail.value })
  },
  onDetail(e: any) {
    this.setData({ detail: e.detail.value })
  },
  onRegionChange(e: any) {
    const region = e.detail.value as string[]
    this.setData({ region, regionText: region.join(" ") })
  },
  onDefaultChange(e: any) {
    this.setData({ isDefault: !!e.detail.value })
  },
  pickLocation() {
    wx.chooseLocation({
      success: (res) => {
        const latitude = res.latitude
        const longitude = res.longitude
        this.setData({
          mapLatitude: latitude,
          mapLongitude: longitude,
          mapMarkers: [{ id: 1, latitude, longitude }],
          geoName: res.name || "",
          geoAddress: res.address || ""
        })
        if (!this.data.detail && res.address) {
          this.setData({ detail: res.address })
        }
      },
      fail: () => {
        wx.showToast({ title: "未选择位置", icon: "none" })
      }
    })
  },
  async onSave() {
    const name = this.data.name.trim()
    const phone = this.data.phone.trim()
    const region = this.data.region
    const detail = this.data.detail.trim()
    if (!name) return wx.showToast({ title: "请输入收货人", icon: "none" })
    if (!isPhone(phone)) return wx.showToast({ title: "手机号不合法", icon: "none" })
    if (!region || region.length !== 3) return wx.showToast({ title: "请选择所在地区", icon: "none" })
    if (!detail) return wx.showToast({ title: "请输入详细地址", icon: "none" })

    const payload: Omit<UserAddress, "id"> = {
      name,
      phone,
      province: region[0],
      city: region[1],
      district: region[2],
      detail,
      isDefault: this.data.isDefault
    }

    wx.showLoading({ title: "保存中..." })
    try {
      let saved: UserAddress
      if (this.data.id) {
        saved = await updateAddress(this.data.id, payload)
      } else {
        saved = await createAddress(payload)
        this.setData({ id: saved.id })
      }
      if (this.data.isDefault && saved?.id) {
        await setDefaultAddress(saved.id)
      }

      const geoMap = readGeoMap()
      if (this.data.mapMarkers.length) {
        geoMap[saved.id] = {
          latitude: this.data.mapLatitude,
          longitude: this.data.mapLongitude,
          name: this.data.geoName,
          address: this.data.geoAddress
        }
        writeGeoMap(geoMap)
      }

      wx.setStorageSync("addressNeedRefresh", true)
      wx.showToast({ title: "保存成功" })
      setTimeout(() => wx.navigateBack(), 600)
    } catch {
      wx.showToast({ title: "保存失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  },
  onDelete() {
    const id = this.data.id
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
          const geoMap = readGeoMap()
          if (geoMap[id]) {
            delete geoMap[id]
            writeGeoMap(geoMap)
          }
          wx.setStorageSync("addressNeedRefresh", true)
          wx.showToast({ title: "已删除" })
          setTimeout(() => wx.navigateBack(), 600)
        } catch {
          wx.showToast({ title: "删除失败", icon: "none" })
        } finally {
          wx.hideLoading()
        }
      }
    })
  }
})
