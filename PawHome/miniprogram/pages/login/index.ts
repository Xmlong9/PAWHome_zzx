import { loginSms, sendSms, setToken, code2Session } from "../../services/auth";
import { isPhone } from "../../utils/validators";

Page({
  data: {
    phone: "",
    code: "",
    smsSending: false,
    smsText: "获取验证码",
    logging: false
  },
  onPhone(e: any) {
    this.setData({ phone: e.detail.value });
  },
  onCode(e: any) {
    this.setData({ code: e.detail.value });
  },
  async onSend() {
    if (this.data.smsSending) return;
    const p = this.data.phone;
    if (!isPhone(p)) {
      wx.showToast({ title: "手机号不合法", icon: "none" });
      return;
    }
    this.setData({ smsSending: true });
    try {
      await sendSms(p);
      let left = 60;
      this.setData({ smsText: `${left}s` });
      const timer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(timer);
          this.setData({ smsSending: false, smsText: "获取验证码" });
        } else {
          this.setData({ smsText: `${left}s` });
        }
      }, 1000);
    } catch (e) {
      wx.showToast({ title: "发送失败", icon: "none" });
      this.setData({ smsSending: false, smsText: "获取验证码" });
    }
  },
  async onLoginSms() {
    if (this.data.logging) return;
    const { phone, code } = this.data;
    if (!isPhone(phone) || !code) {
      wx.showToast({ title: "请输入正确信息", icon: "none" });
      return;
    }
    this.setData({ logging: true });
    try {
      const r = await loginSms(phone, code);
      setToken(r.token);
      wx.showToast({ title: "登录成功" });
      wx.reLaunch({ url: "/pages/index/index" });
    } catch (e) {
      wx.showToast({ title: "登录失败", icon: "none" });
    } finally {
      this.setData({ logging: false });
    }
  },
  onWxLogin() {
    wx.login({
      success: async r => {
        try {
          const data = await code2Session(r.code);
          setToken(data.token);
          wx.showToast({ title: "登录成功" });
          wx.reLaunch({ url: "/pages/index/index" });
        } catch (e) {
          wx.showToast({ title: "登录失败", icon: "none" });
        }
      }
    });
  },
  onSkip() {
    setToken("dev-token");
    wx.showToast({ title: "调试模式" });
    wx.reLaunch({ url: "/pages/index/index" });
  }
});
