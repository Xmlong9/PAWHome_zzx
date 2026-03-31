Page({
  data: {
    petName: "涛涛",
    petMeta: "柯基犬 · 2岁",
    petAvatar: "/assets/images/home/littleface@1x.png",
    itemName: "XXX疫苗",
    storeName: "XX宠物医院",
    date: "XXXX年XX月XX日",
    time: "XX:XX-XX:XX"
  },

  onLoad(options: any) {
    if (options.petName) this.setData({ petName: safeDecode(options.petName) });
    if (options.itemName) this.setData({ itemName: safeDecode(options.itemName) });
    if (options.storeName) this.setData({ storeName: safeDecode(options.storeName) });
    if (options.date) this.setData({ date: safeDecode(options.date) });
    if (options.time) this.setData({ time: safeDecode(options.time) });
  },

  goRecord() {
    wx.redirectTo({ url: "/pages/vaccine/record/index" });
  },

  goHome() {
    wx.switchTab({ url: "/pages/home/index" });
  }
});

function safeDecode(value: any): string {
  if (typeof value !== "string") return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
