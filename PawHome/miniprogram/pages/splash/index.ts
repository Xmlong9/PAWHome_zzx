Page({
  data: {
    countdown: 2,
    timer: null as any
  },

  onLoad() {
    // 动态调整跳过按钮的安全距离
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      safeTop: (sysInfo.statusBarHeight || 20) + 10
    });
  },

  onShow() {
    this.startTimer();
  },

  onHide() {
    this.clearTimer();
  },

  onUnload() {
    this.clearTimer();
  },

  startTimer() {
    this.clearTimer();
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        this.clearTimer();
        this.goToLogin();
      } else {
        this.setData({ countdown: this.data.countdown - 1 });
      }
    }, 1000);
    this.setData({ timer });
  },

  clearTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  onSkip() {
    this.clearTimer();
    this.goToLogin();
  },

  goToLogin() {
    // 判断是否已经登录过，或者直接跳转到 login
    // 如果想要以后加判断，这里可以拦截
    wx.redirectTo({
      url: '/pages/login/index'
    });
  }
});
