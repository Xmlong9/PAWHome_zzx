import { changePassword } from "../../../../services/user"

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  },
  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    });
  },
  submit() {
    const { oldPassword, newPassword, confirmPassword } = this.data;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return wx.showToast({ title: '请填写完整', icon: 'none' });
    }
    if (newPassword !== confirmPassword) {
      return wx.showToast({ title: '两次新密码不一致', icon: 'none' });
    }
    wx.showLoading({ title: '修改中...' });
    Promise.resolve()
      .then(async () => {
        await changePassword(oldPassword, newPassword)
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '修改成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 800);
      })
      .catch((e: any) => {
        console.error(e)
        wx.hideLoading();
        const msg = e?.message || e?.data?.error?.message || '修改失败'
        wx.showToast({ title: msg, icon: 'none' });
      })
  }
});
