import {
  createServiceAppointment,
  getServiceOfferings,
  getServiceProviders,
  getServiceSlots
} from "../../services/petServices"
import { getPetList } from "../../services/user"
import { buildServiceDateOptions, buildSuccessQuery } from "../../utils/serviceBooking"
import { getBaseUrl } from "../../config/env"
import { navigateToWithTransitionOptions } from "../../utils/transition"

function toAbsoluteUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:/i.test(url)) return url
  if (/^wxfile:\/\//i.test(url)) return url
  if (url.startsWith("/assets/")) return url
  const base = getBaseUrl()
  const origin = base.split("/").slice(0, 3).join("/")
  if (url.startsWith("/")) return origin + url
  return origin + "/" + url
}

function getMeta(type: string) {
  if (type === "beauty") return { pageTitle: "美容预约", itemLabel: "美容项目", storeLabel: "门店" }
  if (type === "medical") return { pageTitle: "医疗预约", itemLabel: "就诊科室", storeLabel: "医院" }
  if (type === "foster") return { pageTitle: "寄养预约", itemLabel: "寄养房型", storeLabel: "门店" }
  return { pageTitle: "疫苗预约", itemLabel: "疫苗", storeLabel: "医院" }
}

Page({
  data: {
    type: "vaccine",
    pageTitle: "服务预约",
    itemLabel: "服务",
    storeLabel: "门店",
    showSheet: false,
    sheetVisible: false,
    pets: [] as any[],
    selectedPetId: "",
    serviceItems: [] as any[],
    selectedItemId: "",
    stores: [] as any[],
    selectedStoreId: "",
    selectedStore: null as any,
    mapMarkers: [] as any[],
    mapLat: 30.2760,
    mapLng: 120.1650,
    mapScale: 17,
    days: [] as any[],
    selectedDate: "",
    selectedDateLabel: "",
    slots: [] as any[],
    timeSlots: [] as any[],
    selectedTime: "",
    selectedSlotId: "",
    remark: "",
    totalPrice: 0
  },

  async onLoad(options: any) {
    const type = options.type || "vaccine"
    const meta = getMeta(type)
    wx.setNavigationBarTitle({ title: meta.pageTitle })
    this.setData({ type, ...meta })
    await this.loadPageData(type)
  },

  async loadPageData(type: string) {
    try {
      wx.showLoading({ title: "加载中..." })
      const [petList, providerPayload] = await Promise.all([
        getPetList(),
        getServiceProviders(type)
      ])
      const pets = (petList || []).map((item) => ({
        id: item.id,
        name: item.name,
        avatar: item.avatarUrl || "/assets/images/home/littleface@1x.png"
      }))
      const stores = (providerPayload.list || []).map((item) => ({
        ...item,
        coverImage: toAbsoluteUrl(item.coverImage || "")
      }))
      const selectedPetId = pets[0]?.id || ""
      const selectedStoreId = stores[0]?.id || ""
      this.setData({
        pets,
        selectedPetId,
        stores,
        selectedStoreId,
        selectedStore: stores[0] || null
      })
      this.refreshMap()
      if (selectedStoreId) {
        await this.loadOfferings(type, selectedStoreId)
      }
    } catch (error: any) {
      wx.showToast({ title: error?.message || "加载失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  },

  async loadOfferings(type: string, providerId: string) {
    const payload = await getServiceOfferings({ serviceType: type, providerId })
    const serviceItems = payload.list || []
    const selectedItemId = serviceItems[0]?.id || ""
    this.setData({
      serviceItems,
      selectedItemId,
      totalPrice: serviceItems[0]?.price || 0
    })
    if (selectedItemId) {
      await this.loadSlots(serviceItems[0], "")
    } else {
      this.setData({
        days: [],
        selectedDate: "",
        selectedDateLabel: "",
        slots: [],
        timeSlots: [],
        selectedTime: "",
        selectedSlotId: "",
        totalPrice: 0
      })
    }
  },

  async loadSlots(item: any, selectedDate?: string) {
    const availableDates = item?.availableDates || []
    const days = buildServiceDateOptions(availableDates)
    const dateValue = selectedDate || days[0]?.value || ""
    if (!item?.id || !dateValue) {
      this.setData({
        days,
        selectedDate: "",
        selectedDateLabel: "",
        slots: [],
        timeSlots: [],
        selectedTime: "",
        selectedSlotId: ""
      })
      return
    }
    const payload = await getServiceSlots({ offeringId: item.id, date: dateValue })
    const slots = (payload.list || []).filter((slot) => slot.remaining > 0)
    const selectedSlot = slots[0] || null
    const activeDay = days.find((day) => day.value === dateValue)
    this.setData({
      days,
      selectedDate: dateValue,
      selectedDateLabel: activeDay?.label || "",
      slots,
      timeSlots: slots,
      selectedTime: selectedSlot?.timeLabel || "",
      selectedSlotId: selectedSlot?.id || "",
      totalPrice: item?.price || 0
    })
  },

  selectPet(e: any) {
    this.setData({ selectedPetId: e.currentTarget.dataset.id })
  },

  async selectItem(e: any) {
    const selectedItemId = e.currentTarget.dataset.id
    const item = this.data.serviceItems.find((current: any) => current.id === selectedItemId)
    this.setData({ selectedItemId, totalPrice: item?.price || 0 })
    await this.loadSlots(item, "")
  },

  async selectStore(e: any) {
    const selectedStoreId = e.currentTarget.dataset.id
    if (selectedStoreId === this.data.selectedStoreId) return
    const selectedStore = this.data.stores.find((store: any) => store.id === selectedStoreId) || null
    this.setData({ selectedStoreId, selectedStore })

    const points = getStorePoints(this.data.stores || [])
    const selected = points.find((x) => x.providerId === selectedStoreId)
    this.setData({ mapScale: 11 })
    setTimeout(() => {
      if (selected) {
        this.setData({
          mapLat: selected.latitude,
          mapLng: selected.longitude
        })
      }
      setTimeout(() => {
        this.setData({ mapScale: 17 })
        this.refreshMap()
      }, 400)
    }, 400)
    await this.loadOfferings(this.data.type, selectedStoreId)
  },

  onMapMarkerTap(e: any) {
    const markerId = e.detail.markerId
    if (markerId === undefined) return
    const marker = this.data.mapMarkers.find((m: any) => m.id === markerId)
    if (!marker) return
    this.selectStore({ currentTarget: { dataset: { id: marker.providerId } } })
  },

  refreshMap() {
    const points = getStorePoints(this.data.stores || [])
    const selected = points.find((x) => x.providerId === this.data.selectedStoreId) || points[0] || null
    const mapMarkers = points.map((item) => ({
      ...item,
      active: item.providerId === (selected?.providerId || "")
    }))
    const updateData: any = { mapMarkers }
    if (selected && this.data.mapLat === 30.2760 && this.data.mapLng === 120.1650) {
      updateData.mapLat = selected.latitude
      updateData.mapLng = selected.longitude
      updateData.mapScale = 17
    }
    this.setData(updateData)
  },

  goAppointmentRecords() {
    const type = this.data.type || "beauty"
    if (type === "vaccine") {
      navigateToWithTransitionOptions({ url: "/pages/vaccine/appointments/index" })
      return
    }
    navigateToWithTransitionOptions({ url: `/pages/service/appointments/index?type=${encodeURIComponent(type)}` })
  },

  async selectDate(e: any) {
    const dateValue = e.currentTarget.dataset.val
    const item = this.data.serviceItems.find((current: any) => current.id === this.data.selectedItemId)
    await this.loadSlots(item, dateValue)
  },

  selectTimeSlot(e: any) {
    const slotId = e.currentTarget.dataset.id
    const slot = this.data.slots.find((current: any) => current.id === slotId)
    this.setData({
      selectedSlotId: slotId,
      selectedTime: slot?.timeLabel || ""
    })
  },

  bindRemarkInput(e: any) {
    this.setData({ remark: e.detail.value })
  },

  openSheet() {
    if (this.data.showSheet) return
    this.setData({ showSheet: true, sheetVisible: false })
    setTimeout(() => {
      this.setData({ sheetVisible: true })
    }, 20)
  },

  closeSheet() {
    if (!this.data.showSheet) return
    this.setData({ sheetVisible: false })
    setTimeout(() => {
      this.setData({ showSheet: false })
    }, 240)
  },

  async submitOrder() {
    const pet = this.data.pets.find((item: any) => item.id === this.data.selectedPetId)
    const offering = this.data.serviceItems.find((item: any) => item.id === this.data.selectedItemId)
    const store = this.data.selectedStore
    const slot = this.data.slots.find((item: any) => item.id === this.data.selectedSlotId)

    if (!pet) {
      wx.showToast({ title: "请选择宠物", icon: "none" })
      return
    }
    if (!store) {
      wx.showToast({ title: "请选择门店", icon: "none" })
      return
    }
    if (!offering) {
      wx.showToast({ title: "请选择项目", icon: "none" })
      return
    }
    if (!slot) {
      wx.showToast({ title: "请选择预约时间", icon: "none" })
      return
    }

    try {
      wx.showLoading({ title: "提交中..." })
      const appointment = await createServiceAppointment({
        serviceType: this.data.type,
        petId: pet.id,
        providerId: store.id,
        offeringId: offering.id,
        slotId: slot.id,
        appointmentAt: slot.appointmentAt,
        notes: this.data.remark
      })
      navigateToWithTransitionOptions({
        url: `/pages/service/success/index${buildSuccessQuery({
          type: this.data.type,
          appointmentId: appointment.id,
          petId: pet.id,
          petName: pet.name,
          itemName: appointment.offering?.name || offering.name,
          storeName: appointment.provider?.name || store.name,
          date: appointment.serviceDate || slot.serviceDate,
          time: appointment.timeLabel || slot.timeLabel
        })}`
      })
    } catch (error: any) {
      wx.showToast({ title: error?.message || "预约失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  }
})

function getStorePoints(stores: any[]) {
  const presets: Record<string, { lat: number; lng: number }> = {
    "provider-beauty-1": { lat: 30.2760, lng: 120.1650 },
    "provider-beauty-2": { lat: 30.2868, lng: 120.1765 },
    "provider-medical-1": { lat: 30.2726, lng: 120.1548 },
    "provider-medical-2": { lat: 30.2636, lng: 120.1849 },
    "provider-foster-1": { lat: 30.2516, lng: 120.1708 },
    "provider-foster-2": { lat: 30.2965, lng: 120.1888 }
  }
  return (stores || []).map((s, index) => {
    const preset = presets[s.id]
    let lat, lng
    if (preset) {
      lat = preset.lat
      lng = preset.lng
    } else {
      lat = 30.2760 + index * 0.01
      lng = 120.1650 + index * 0.01
    }
    return {
      id: index + 1,
      providerId: s.id,
      latitude: lat,
      longitude: lng,
      width: 0,
      height: 0,
      customCallout: {
        display: "ALWAYS",
        anchorY: 0,
        anchorX: 0
      }
    }
  })
}
