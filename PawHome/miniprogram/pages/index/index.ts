import { login, register } from "../../services/auth";
import { clearSession } from "../../services/session";

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    isRegister: false,
    loginType: 'password',
    
    // Login fields
    account: "",
    password: "",
    
    // Register fields
    regUsername: "",
    regEmail: "",
    regPassword: "",
    regPasswordConfirm: "",
    logging: false,

    // User info modal
    showUserInfo: false,
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },

  onLoad() {
    // Check if token exists, etc. (handled in app.ts usually)
  },

  onInput(e: any) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  toggleRegister() {
    this.setData({
      isRegister: !this.data.isRegister
    });
  },

  switchLoginType() {
    this.setData({ loginType: 'password' });
  },

  async onLogin() {
    if (this.data.logging) return;

    const { account, password } = this.data;
    if (!account || !password) {
      wx.showToast({ title: "请输入邮箱和密码", icon: "none" });
      return;
    }
    this.setData({ logging: true });
    try {
      await login(account, password);
      wx.showToast({ title: "登录成功" });
      this.goMain();
    } catch (e) {
      wx.showToast({ title: "登录失败", icon: "none" });
    } finally {
      this.setData({ logging: false });
    }
  },

  onRegister() {
    const { regUsername, regEmail, regPassword, regPasswordConfirm } = this.data;
    if (!regUsername || !regEmail || !regPassword || !regPasswordConfirm) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      wx.showToast({ title: "两次密码不一致", icon: "none" });
      return;
    }

    this.setData({ logging: true });
    register(regEmail, regPassword, regUsername)
      .then(() => {
        wx.showToast({ title: "注册成功" });
        this.toggleRegister();
      })
      .catch(() => {
        wx.showToast({ title: "注册失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ logging: false });
      });
  },

  onSkip() {
    clearSession();
    wx.showToast({ title: "调试模式" });
    this.goMain();
  },

  // User Info methods (from original index.ts)
  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    const { nickName } = this.data.userInfo;
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: !!(nickName && avatarUrl && avatarUrl !== defaultAvatarUrl),   
    });
  },
  
  onInputChange(e: any) {
    const nickName = e.detail.value;
    const { avatarUrl } = this.data.userInfo;
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: !!(nickName && avatarUrl && avatarUrl !== defaultAvatarUrl),   
    });
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '展示用户信息', 
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      }
    });
  },

  goMain() {
    wx.reLaunch({ url: '/pages/home/index' });
  }
});
