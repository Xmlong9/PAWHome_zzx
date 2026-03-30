Page({
  data: {
    petName: "涛涛",
    vaccineName: "XXX疫苗",
    hospitalName: "XX宠物医院",
    date: "XXXX-XX-XX",
    time: "XX:XX",
    aheadText: "提前 1 天",
    channelText: "推送通知",
    remark: "",
    addToCalendar: false
  },

  pickAhead() {
    wx.showActionSheet({
      itemList: ["提前 1 天", "提前 2 天", "提前 3 天"],
      success: (res) => {
        const map = ["提前 1 天", "提前 2 天", "提前 3 天"];
        this.setData({ aheadText: map[res.tapIndex] });
      }
    });
  },

  pickChannel() {
    wx.showActionSheet({
      itemList: ["推送通知", "短信通知"],
      success: (res) => {
        const map = ["推送通知", "短信通知"];
        this.setData({ channelText: map[res.tapIndex] });
      }
    });
  },

  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  onToggle(e: any) {
    this.setData({ addToCalendar: e.detail.value });
  },

  save() {
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => {
      wx.navigateBack();
    }, 800);
  }
});

