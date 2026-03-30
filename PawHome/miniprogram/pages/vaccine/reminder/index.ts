import { getReminderByAppointment, upsertVaccineReminder } from "../../../services/vaccines";

Page({
  data: {
    appointmentId: "",
    petName: "",
    vaccineName: "",
    hospitalName: "",
    date: "",
    time: "",
    aheadDays: 1,
    channel: "push" as "push" | "sms",
    aheadText: "提前 1 天",
    channelText: "推送通知",
    remark: "",
    addToCalendar: false
  },

  async onLoad(options: any) {
    const appointmentId = typeof options?.appointmentId === "string" ? options.appointmentId : "";
    const petName = typeof options?.petName === "string" ? options.petName : "";
    const vaccineName = typeof options?.itemName === "string" ? options.itemName : "";
    const hospitalName = typeof options?.storeName === "string" ? options.storeName : "";
    const date = typeof options?.date === "string" ? options.date : "";
    const time = typeof options?.time === "string" ? options.time : "";
    this.setData({
      appointmentId,
      petName,
      vaccineName,
      hospitalName,
      date,
      time
    });

    if (appointmentId) {
      await this.loadOrCreateReminder(appointmentId);
    }
  },

  async loadOrCreateReminder(appointmentId: string) {
    try {
      const payload = await getReminderByAppointment(appointmentId);
      if (!payload?.exists) {
        const reminder = await upsertVaccineReminder({
          appointmentId,
          aheadDays: 1,
          channel: "push"
        });
        this.applyReminderToData(reminder);
        return;
      }
      if (payload.reminder) {
        this.applyReminderToData(payload.reminder);
      }
    } catch (error: any) {
      wx.showToast({ title: error?.message || "加载失败", icon: "none" });
    }
  },

  applyReminderToData(reminder: any) {
    const aheadDays = typeof reminder?.aheadDays === "number" ? reminder.aheadDays : 1;
    const channel = reminder?.channel === "sms" ? "sms" : "push";
    this.setData({
      aheadDays,
      channel,
      aheadText: aheadTextFromDays(aheadDays),
      channelText: channel === "sms" ? "短信通知" : "推送通知",
      remark: reminder?.remark || "",
      addToCalendar: !!reminder?.addToCalendar,
      vaccineName: this.data.vaccineName || reminder?.vaccineName || ""
    });
  },

  pickAhead() {
    wx.showActionSheet({
      itemList: ["提前 1 天", "提前 2 天", "提前 3 天"],
      success: (res) => {
        const values = [1, 2, 3];
        const aheadDays = values[res.tapIndex] || 1;
        this.setData({ aheadDays, aheadText: aheadTextFromDays(aheadDays) });
      }
    });
  },

  pickChannel() {
    wx.showActionSheet({
      itemList: ["推送通知", "短信通知"],
      success: (res) => {
        const channel = res.tapIndex === 1 ? "sms" : "push";
        this.setData({
          channel,
          channelText: channel === "sms" ? "短信通知" : "推送通知"
        });
      }
    });
  },

  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  onToggle(e: any) {
    this.setData({ addToCalendar: e.detail.value });
  },

  async save() {
    const appointmentId = this.data.appointmentId;
    if (!appointmentId) {
      wx.showToast({ title: "缺少预约信息", icon: "none" });
      return;
    }
    try {
      wx.showLoading({ title: "保存中..." });
      await upsertVaccineReminder({
        appointmentId,
        aheadDays: this.data.aheadDays,
        channel: this.data.channel,
        remark: this.data.remark,
        addToCalendar: this.data.addToCalendar
      });
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => {
        wx.navigateBack();
      }, 800);
    } catch (error: any) {
      wx.showToast({ title: error?.message || "保存失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});

function aheadTextFromDays(days: number) {
  const v = typeof days === "number" && days >= 0 ? days : 1;
  return `提前 ${v} 天`;
}
