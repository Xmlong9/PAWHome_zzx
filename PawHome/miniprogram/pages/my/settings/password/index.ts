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
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1000);
  }
});
