import { listRechargeOptions, submitRecharge } from "../../services/shop"

type RechargeOption = { id: string; amount: number; bonus: number }

Page({
  data: {
    options: [] as RechargeOption[],
    selectedId: "",
    balance: Number(wx.getStorageSync("wallet_balance") || 0)
  },
  async onShow() {
    const options = await listRechargeOptions()
    this.setData({
      options,
      selectedId: options[0]?.id || "",
      balance: Number(wx.getStorageSync("wallet_balance") || 0)
    })
  },
  chooseOption(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    this.setData({ selectedId: id })
  },
  async submit() {
    if (!this.data.selectedId) return
    try {
      const res = await submitRecharge(this.data.selectedId)
      this.setData({ balance: res.balance })
      wx.showToast({ title: "充值成功", icon: "success" })
    } catch {
      wx.showToast({ title: "充值失败", icon: "none" })
    }
  }
})
