import { loginSms, sendSms, setToken, code2Session } from "../../services/auth";
import { isPhone } from "../../utils/validators";

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    isRegister: false,
    loginType: 'password', // 'password' or 'sms'
    
    // Login fields
    account: "", // username or phone
    password: "",
    code: "",
    
    // Register fields
    regUsername: "",
    regEmail: "",
    regPhone: "",
    regPassword: "",
    regPasswordConfirm: "",

    smsSending: false,
    smsText: "获取验证码",
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
    this.setData({
      loginType: this.data.loginType === 'password' ? 'sms' : 'password'
    });
  },

  async onSend() {
    if (this.data.smsSending) return;
    const p = this.data.account;
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

  async onLogin() {
    if (this.data.logging) return;
    
    if (this.data.loginType === 'sms') {
      const { account, code } = this.data;
      if (!isPhone(account) || !code) {
        wx.showToast({ title: "请输入正确信息", icon: "none" });
        return;
      }
      this.setData({ logging: true });
      try {
        const r = await loginSms(account, code);
        setToken(r.token);
        wx.showToast({ title: "登录成功" });
        this.goMain();
      } catch (e) {
        wx.showToast({ title: "登录失败", icon: "none" });
      } finally {
        this.setData({ logging: false });
      }
    } else {
      // Password login logic (mock)
      const { account, password } = this.data;
      if (!account || !password) {
        wx.showToast({ title: "请输入账号和密码", icon: "none" });
        return;
      }
      this.setData({ logging: true });
      setTimeout(() => {
        setToken("mock-token-password");
        wx.showToast({ title: "登录成功" });
        this.goMain();
        this.setData({ logging: false });
      }, 1000);
    }
  },

  onRegister() {
    const { regUsername, regEmail, regPhone, regPassword, regPasswordConfirm } = this.data;
    if (!regUsername || !regEmail || !regPhone || !regPassword || !regPasswordConfirm) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      wx.showToast({ title: "两次密码不一致", icon: "none" });
      return;
    }
    wx.showToast({ title: "注册成功，请登录", icon: "none" });
    this.toggleRegister();
  },

  onWxLogin() {
    wx.login({
      success: async r => {
        try {
          const data = await code2Session(r.code);
          setToken(data.token);
          wx.showToast({ title: "登录成功" });
          
          // Optionally show user profile modal here if needed, or just go to main
          if (!this.data.hasUserInfo) {
            this.setData({ showUserInfo: true });
          } else {
            this.goMain();
          }
        } catch (e) {
          wx.showToast({ title: "登录失败", icon: "none" });
        }
      }
    });
  },

  onSkip() {
    setToken("dev-token");
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
