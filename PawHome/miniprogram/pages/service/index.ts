import {
  createServiceAppointment,
  getServiceOfferings,
  getServiceProviders,
  getServiceSlots
} from "../../services/petServices"
import { getPetList } from "../../services/user"
import { buildServiceDateOptions, buildSuccessQuery } from "../../utils/serviceBooking"
import { getBaseUrl } from "../../config/env"

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
    pets: [] as any[],
    selectedPetId: "",
    serviceItems: [] as any[],
    selectedItemId: "",
    stores: [] as any[],
    selectedStoreId: "",
    selectedStore: null as any,
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
      await this.loadSlots(serviceItems[0], serviceItems[0]?.availableDates?.[0] || "")
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
    await this.loadSlots(item, item?.availableDates?.[0] || "")
  },

  async selectStore(e: any) {
    const selectedStoreId = e.currentTarget.dataset.id
    const selectedStore = this.data.stores.find((store: any) => store.id === selectedStoreId) || null
    this.setData({ selectedStoreId, selectedStore })
    await this.loadOfferings(this.data.type, selectedStoreId)
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
    this.setData({ showSheet: true })
  },

  closeSheet() {
    this.setData({ showSheet: false })
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
      wx.navigateTo({
        url: `/pages/service/success/index${buildSuccessQuery({
          type: this.data.type,
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
