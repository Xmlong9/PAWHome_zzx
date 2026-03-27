import { login, register } from "../../services/auth";
import { clearSession } from "../../services/session";

Page({
  data: {
    email: "",
    password: "",
    logging: false
  },
  onEmail(e: any) {
    this.setData({ email: e.detail.value });
  },
  onPassword(e: any) {
    this.setData({ password: e.detail.value });
  },
  async onLogin() {
    if (this.data.logging) return;
    const { email, password } = this.data;
    if (!email || !password) {
      wx.showToast({ title: "请输入邮箱和密码", icon: "none" });
      return;
    }
    this.setData({ logging: true });
    try {
      await login(email, password);
      wx.showToast({ title: "登录成功" });
      wx.reLaunch({ url: "/pages/index/index" });
    } catch (e) {
      wx.showToast({ title: "登录失败", icon: "none" });
    } finally {
      this.setData({ logging: false });
    }
  },
  async onRegister() {
    if (this.data.logging) return;
    const { email, password } = this.data;
    if (!email || !password) {
      wx.showToast({ title: "请输入邮箱和密码", icon: "none" });
      return;
    }
    this.setData({ logging: true });
    try {
      await register(email, password);
      wx.showToast({ title: "注册成功" });
      wx.reLaunch({ url: "/pages/index/index" });
    } catch (e) {
      wx.showToast({ title: "注册失败", icon: "none" });
    } finally {
      this.setData({ logging: false });
    }
  },
  onSkip() {
    clearSession();
    wx.showToast({ title: "调试模式" });
    wx.reLaunch({ url: "/pages/index/index" });
  }
});
