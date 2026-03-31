import { listRechargeOptions, submitRecharge } from "../../services/shop"

type RechargeOption = { id: string; amount: number; bonus: number }

const fallbackOptions: RechargeOption[] = [
  { id: "r1", amount: 30, bonus: 0 },
  { id: "r2", amount: 68, bonus: 8 },
  { id: "r3", amount: 128, bonus: 20 },
  { id: "r4", amount: 328, bonus: 68 }
]

Page({
  data: {
    options: [] as RechargeOption[],
    selectedId: "",
    balance: Number(wx.getStorageSync("wallet_balance") || 0)
  },
  async onShow() {
    let options: RechargeOption[] = []
    try {
      options = await listRechargeOptions()
    } catch {
      options = [...fallbackOptions]
    }
    if (!Array.isArray(options) || !options.length) options = [...fallbackOptions]
    const selectedId = this.data.selectedId || options[0]?.id || ""
    this.setData({
      options,
      selectedId,
      balance: Number(wx.getStorageSync("wallet_balance") || 0)
    })
  },
  chooseOption(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    this.setData({ selectedId: id })
  },
  async submit() {
    if (!this.data.selectedId) {
      wx.showToast({ title: "请选择充值金额", icon: "none" })
      return
    }
    try {
      wx.showLoading({ title: "充值中..." })
      const res = await submitRecharge(this.data.selectedId)
      this.setData({ balance: res.balance })
      wx.showToast({ title: "充值成功", icon: "success" })
    } catch {
      wx.showToast({ title: "充值失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  }
})
