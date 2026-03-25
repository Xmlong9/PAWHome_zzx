import { getUserProfile, updateUserProfile, UserProfile } from "../../../services/user"

Page({
  data: {
    userInfo: null as UserProfile | null,
    nickname: "",
    gender: "",
    birthday: "",
    location: "",
    signature: ""
  },
  async onLoad() {
    try {
      const userInfo = await getUserProfile()
      this.setData({ 
        userInfo,
        nickname: userInfo.nickname || "",
        gender: userInfo.gender || "",
        birthday: userInfo.birthday || "",
        location: userInfo.location || "",
        signature: userInfo.signature || ""
      })
    } catch (e) {
      console.error(e)
    }
  },
  onInput(e: any) {
    const { field } = e.currentTarget.dataset
    this.setData({ [field]: e.detail.value })
  },
  onGenderChange(e: any) {
    this.setData({ gender: e.detail.value })
  },
  onDateChange(e: any) {
    this.setData({ birthday: e.detail.value })
  },
  async onSave() {
    wx.showLoading({ title: '保存中...' })
    try {
      await updateUserProfile({
        nickname: this.data.nickname,
        gender: this.data.gender as "男" | "女",
        birthday: this.data.birthday,
        location: this.data.location,
        signature: this.data.signature
      })
      wx.hideLoading()
      wx.showToast({ title: '保存成功' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },
  changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ 'userInfo.avatarUrl': tempFilePath })
        // 实际开发中需要先上传图片获取真实URL
      }
    })
  }
})