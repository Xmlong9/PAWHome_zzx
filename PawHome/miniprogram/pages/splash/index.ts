Page({
  data: {
    countdown: 3,
    timer: null as any
  },

  onLoad() {
    this.startTimer();
  },

  onShow() {
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
    wx.redirectTo({
      url: '/pages/index/index'
    });
  }
});
