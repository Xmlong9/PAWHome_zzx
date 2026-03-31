const { deleteServiceAppointment, getServiceAppointmentDetail } = require("../../../../services/petServices");
const { getPetList } = require("../../../../services/user");
const { buildSuccessQuery } = require("../../../../utils/serviceBooking");

Page({
  data: {
    appointmentId: "",
    petId: "",
    petName: "",
    vaccineName: "",
    hospitalName: "",
    date: "",
    time: "",
    statusText: "",
    reminderText: "设置"
  },

  async onLoad(options) {
    const appointmentId = typeof (options && options.appointmentId) === "string" ? options.appointmentId : "";
    if (!appointmentId) {
      wx.showToast({ title: "缺少预约信息", icon: "none" });
      return;
    }
    this.setData({ appointmentId });
    await this.loadDetail(appointmentId);
  },

  async loadDetail(appointmentId) {
    try {
      wx.showLoading({ title: "加载中..." });
      const [appointment, petList] = await Promise.all([getServiceAppointmentDetail(appointmentId), getPetList()]);
      const pets = petList || [];
      const pet = pets.find((p) => p.id === appointment.petId);
      const petName = (pet && pet.name) || "";
      const vaccineName = (appointment && appointment.vaccine && appointment.vaccine.name) || (appointment && appointment.offering && appointment.offering.name) || "接种预约";
      const hospitalName = (appointment && appointment.provider && appointment.provider.name) || "";
      const date = formatDate((appointment && appointment.serviceDate) || "");
      const time = (appointment && appointment.timeLabel) || "";
      const statusText = buildStatusText((appointment && appointment.appointmentAt) || "", (appointment && appointment.status) || "");
      this.setData({
        petId: (appointment && appointment.petId) || "",
        petName,
        vaccineName,
        hospitalName,
        date,
        time,
        statusText
      });
    } catch (e) {
      wx.showToast({ title: (e && e.message) || "加载失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  goReminder() {
    const appointmentId = this.data.appointmentId;
    if (!appointmentId) return;
    const query = buildSuccessQuery({
      type: "vaccine",
      petName: this.data.petName,
      itemName: this.data.vaccineName,
      storeName: this.data.hospitalName,
      date: this.data.date,
      time: this.data.time
    });
    const extra = query.startsWith("?") ? `&${query.slice(1)}` : query;
    wx.navigateTo({
      url: `/pages/vaccine/reminder/index?appointmentId=${encodeURIComponent(appointmentId)}${extra}`
    });
  },

  onDelete() {
    const appointmentId = this.data.appointmentId;
    if (!appointmentId) return;
    wx.showModal({
      title: "删除记录",
      content: "删除后将不再显示该预约记录，确定删除吗？",
      confirmText: "删除",
      confirmColor: "#ef4444",
      success: async (r) => {
        if (!r.confirm) return;
        wx.showLoading({ title: "删除中..." });
        try {
          await deleteServiceAppointment(appointmentId);
          wx.showToast({ title: "已删除" });
          setTimeout(() => wx.navigateBack(), 600);
        } catch (e) {
          wx.showToast({ title: (e && e.message) || "删除失败", icon: "none" });
        } finally {
          wx.hideLoading();
        }
      }
    });
  }
});

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildStatusText(appointmentAtIso, status) {
  const t = new Date(appointmentAtIso || "").getTime();
  const isPast = Number.isNaN(t) ? false : t < Date.now();
  if (status === "canceled") return "已取消";
  if (status === "completed") return "已完成";
  if (isPast) return "已过期";
  return "已预约";
}

