import { getBaseUrl } from "../../../config/env"
import { getPetList } from "../../../services/user"

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

function safeDecode(value: any): string {
  if (typeof value !== "string") return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

Page({
  data: {
    petName: '涛涛',
    petAvatar: '/assets/images/home/littleface@1x.png',
    itemName: '核心疫苗（狂犬/多联）',
    storeName: 'XX宠物医院',
    date: '2024-05-20',
    time: '14:30',
    tipsTitle: '接种须知',
    tips: [] as any[],
    type: "vaccine",
    petId: "",
    appointmentId: ""
  },

  async onLoad(options: any) {
    const type = safeDecode(options?.type) || "vaccine"
    const appointmentId = safeDecode(options?.appointmentId)
    const petId = safeDecode(options?.petId)
    const petName = safeDecode(options?.petName) || ""
    const itemName = safeDecode(options?.itemName) || ""
    const storeName = safeDecode(options?.storeName) || ""
    const date = safeDecode(options?.date) || ""
    const time = safeDecode(options?.time) || ""
    this.setData({
      type,
      appointmentId,
      petId,
      petName: petName || this.data.petName,
      itemName: itemName || this.data.itemName,
      storeName: storeName || this.data.storeName,
      date: date || this.data.date,
      time: time || this.data.time
    })

    this.initTips(type)
    await this.tryLoadPetAvatar(petId, petName)
  },

  initTips(type: string) {
    let tipsTitle = '服务须知';
    let tips: any[] = [];

    if (type === 'vaccine') {
      tipsTitle = '接种须知';
      tips = [
        { iconType: 'clock', text: '请提前 15 分钟到达医院' },
        { iconType: 'fork', text: '接种前 4 小时禁食' },
        { iconType: 'id', text: '请携带宠物相关证件' },
        { iconType: 'eye', text: '接种后需观察 30 分钟' }
      ];
    } else if (type === 'medical') {
      tipsTitle = '就诊须知';
      tips = [
        { iconType: 'clock', text: '请提前 15 分钟到达医院' },
        { iconType: 'fork', text: '如需抽血请提前 8 小时禁食' },
        { iconType: 'id', text: '请携带过往就诊病历' }
      ];
    } else if (type === 'beauty') {
      tipsTitle = '美容须知';
      tips = [
        { iconType: 'clock', text: '请按预约时间准时到达门店' },
        { iconType: 'fork', text: '如宠物有攻击性或皮肤病请提前告知' },
        { iconType: 'clock', text: '洗护约需 1-2 小时，请合理安排时间' }
      ];
    } else if (type === 'foster') {
      tipsTitle = '寄养须知';
      tips = [
        { iconType: 'fork', text: '请携带宠物日常口粮以防肠胃不适' },
        { iconType: 'id', text: '请携带有效疫苗本及驱虫记录' },
        { iconType: 'eye', text: '自带宠物熟悉的玩具可减轻焦虑' }
      ];
    }

    this.setData({ tipsTitle, tips });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  goOrderList() {
    const type = this.data.type || "vaccine"
    if (type === "vaccine") {
      wx.redirectTo({ url: "/pages/vaccine/record/index" })
      return
    }
    wx.redirectTo({ url: `/pages/service/index?type=${encodeURIComponent(type)}` });
  },

  goAppointmentRecords() {
    const type = this.data.type || "vaccine"
    if (type === "vaccine") {
      wx.navigateTo({ url: "/pages/vaccine/appointments/index" })
      return
    }
    wx.navigateTo({ url: `/pages/service/appointments/index?type=${encodeURIComponent(type)}` })
  },

  async tryLoadPetAvatar(petId: string, petName: string) {
    try {
      const list = await getPetList()
      const pets = list || []
      const pet = (petId
        ? pets.find((p: any) => p.id === petId)
        : pets.find((p: any) => p.name === petName)) || null
      const avatar = pet?.avatarUrl || ""
      if (avatar) this.setData({ petAvatar: toAbsoluteUrl(avatar) })
    } catch {
    }
  }
});
