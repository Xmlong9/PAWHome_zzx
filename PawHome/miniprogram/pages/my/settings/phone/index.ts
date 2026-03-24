Page({
  data: {
    phone: '',
    code: '',
    counting: false,
    countdown: 60
  },
  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    });
  },
  sendCode() {
    if (!this.data.phone || this.data.phone.length !== 11) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
    }
    if (this.data.counting) return;
    
    this.setData({ counting: true, countdown: 60 });
    wx.showToast({ title: '验证码已发送', icon: 'none' });
    
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        clearInterval(timer);
        this.setData({ counting: false });
      } else {
        this.setData({ countdown: this.data.countdown - 1 });
      }
    }, 1000);
  },
  submit() {
    const { phone, code } = this.data;
    if (!phone || !code) {
      return wx.showToast({ title: '请填写完整', icon: 'none' });
    }
    wx.showLoading({ title: '验证中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '验证成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1000);
  }
});
