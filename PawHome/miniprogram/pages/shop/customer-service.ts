import { listFaqs } from "../../services/shop"

Page({
  data: {
    history: [
      { id: "h1", title: "订单退款咨询", status: "已解决", time: "2024-01-15" }
    ]
  },
  async onLoad() {
  },
  callNow() {
    wx.makePhoneCall({ phoneNumber: "4008888888" })
  },
  toHuman() {
    wx.showToast({ title: "已接入人工排队", icon: "none" })
  }
})
