Page({
  data: {
    petIndex: 0,
    pets: [
      {
        id: "p1",
        name: "涛涛",
        meta: "金毛 | 1岁2个月｜公",
        avatar: "/assets/images/home/littleface@1x.png"
      },
      {
        id: "p2",
        name: "宠宠",
        meta: "英短 | 2岁｜母",
        avatar: "/assets/images/home/littleface@1x.png"
      }
    ],
    activeTab: "core",
    records: []
  },

  onLoad() {
    this.refreshRecords();
  },

  get currentPet() {
    return this.data.pets[this.data.petIndex];
  },

  switchPet() {
    const next = (this.data.petIndex + 1) % this.data.pets.length;
    this.setData({ petIndex: next }, () => this.refreshRecords());
  },

  setTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => this.refreshRecords());
  },

  refreshRecords() {
    const { activeTab } = this.data;
    const base = [
      {
        id: "r1",
        title: "XX疫苗",
        status: "已完成",
        line1: "XXXX年XX月XX日",
        line2: "XX宠物医院",
        nextTime: "XXXX年XX月XX日"
      },
      {
        id: "r2",
        title: "XX疫苗",
        status: "已完成",
        line1: "XXXX年XX月XX日",
        line2: "XX宠物医院",
        nextTime: "XX年XX月XX日"
      }
    ];
    const records = base.map((x) => ({ ...x, id: `${activeTab}_${x.id}` }));
    this.setData({ records });
  },

  goAppointment() {
    wx.navigateTo({ url: "/pages/vaccine/appointment/index" });
  },

  goReminder() {
    wx.navigateTo({ url: "/pages/vaccine/reminder/index" });
  },

  goImport() {
    wx.navigateTo({ url: "/pages/vaccine/import/index" });
  }
});
