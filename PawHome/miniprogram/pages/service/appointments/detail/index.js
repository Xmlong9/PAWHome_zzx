const { deleteServiceAppointment, getServiceAppointmentDetail } = require("../../../../services/petServices")
const { getPetList } = require("../../../../services/user")

function safeDecode(value) {
  if (typeof value !== "string") return ""
  try {
    return decodeURIComponent(value)
  } catch (e) {
    return value
  }
}

Page({
  data: {
    type: "",
    appointmentId: "",
    petId: "",
    petName: "",
    itemName: "",
    storeName: "",
    date: "",
    time: "",
    statusText: ""
  },

  async onLoad(options) {
    const appointmentId = safeDecode(options && options.appointmentId)
    const type = safeDecode(options && options.type)
    if (!appointmentId) {
      wx.showToast({ title: "缺少预约信息", icon: "none" })
      return
    }
    this.setData({ appointmentId, type })
    await this.loadDetail(appointmentId)
  },

  async loadDetail(appointmentId) {
    try {
      wx.showLoading({ title: "加载中..." })
      const result = await Promise.all([getServiceAppointmentDetail(appointmentId), getPetList()])
      const appointment = result[0]
      const petList = result[1]
      const pets = petList || []
      const pet = pets.find((p) => p.id === appointment.petId)
      const petName = (pet && pet.name) || ""
      const itemName = (appointment && appointment.offering && appointment.offering.name) || "服务预约"
      const storeName = (appointment && appointment.provider && appointment.provider.name) || ""
      const date = formatDate((appointment && appointment.serviceDate) || "")
      const time = (appointment && appointment.timeLabel) || ""
      const statusText = buildStatusText((appointment && appointment.appointmentAt) || "", (appointment && appointment.status) || "")
      this.setData({
        petId: (appointment && appointment.petId) || "",
        petName,
        itemName,
        storeName,
        date,
        time,
        statusText
      })
    } catch (e) {
      wx.showToast({ title: (e && e.message) || "加载失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  },

  onDelete() {
    const appointmentId = this.data.appointmentId
    if (!appointmentId) return
    wx.showModal({
      title: "删除记录",
      content: "删除后将不再显示该预约记录，确定删除吗？",
      confirmText: "删除",
      confirmColor: "#ef4444",
      success: async (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: "删除中..." })
        try {
          await deleteServiceAppointment(appointmentId)
          wx.showToast({ title: "已删除" })
          setTimeout(() => wx.navigateBack(), 600)
        } catch (e) {
          wx.showToast({ title: (e && e.message) || "删除失败", icon: "none" })
        } finally {
          wx.hideLoading()
        }
      }
    })
  }
})

function formatDate(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

function buildStatusText(appointmentAtIso, status) {
  const t = new Date(appointmentAtIso || "").getTime()
  const isPast = Number.isNaN(t) ? false : t < Date.now()
  if (status === "canceled") return "已取消"
  if (status === "completed") return "已完成"
  if (isPast) return "已过期"
  return "已预约"
}

