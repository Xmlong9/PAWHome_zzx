const { getReminderByAppointment, upsertVaccineReminder } = require("../../../services/vaccines");

Page({
  data: {
    appointmentId: "",
    petName: "",
    vaccineName: "",
    hospitalName: "",
    date: "",
    time: "",
    aheadDays: 1,
    channel: "push",
    aheadText: "提前 1 天",
    channelText: "推送通知",
    remark: "",
    addToCalendar: false
  },

  async onLoad(options) {
    const appointmentId = typeof (options && options.appointmentId) === "string" ? options.appointmentId : "";
    const petName = typeof (options && options.petName) === "string" ? safeDecode(options.petName) : "";
    const vaccineName = typeof (options && options.itemName) === "string" ? safeDecode(options.itemName) : "";
    const hospitalName = typeof (options && options.storeName) === "string" ? safeDecode(options.storeName) : "";
    const date = typeof (options && options.date) === "string" ? safeDecode(options.date) : "";
    const time = typeof (options && options.time) === "string" ? safeDecode(options.time) : "";
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

  async loadOrCreateReminder(appointmentId) {
    try {
      const payload = await getReminderByAppointment(appointmentId);
      if (!payload || !payload.exists) {
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
    } catch (error) {
      wx.showToast({ title: (error && error.message) || "加载失败", icon: "none" });
    }
  },

  applyReminderToData(reminder) {
    const aheadDays = typeof (reminder && reminder.aheadDays) === "number" ? reminder.aheadDays : 1;
    const channel = reminder && reminder.channel === "sms" ? "sms" : "push";
    this.setData({
      aheadDays,
      channel,
      aheadText: aheadTextFromDays(aheadDays),
      channelText: channel === "sms" ? "短信通知" : "推送通知",
      remark: (reminder && reminder.remark) || "",
      addToCalendar: !!(reminder && reminder.addToCalendar),
      vaccineName: this.data.vaccineName || (reminder && reminder.vaccineName) || ""
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

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onToggle(e) {
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
    } catch (error) {
      wx.showToast({ title: (error && error.message) || "保存失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});

function aheadTextFromDays(days) {
  const v = typeof days === "number" && days >= 0 ? days : 1;
  return `提前 ${v} 天`;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}
