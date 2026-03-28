import { loginSms, sendSms, setToken, code2Session, loginPassword, registerUser } from "../../services/auth";
import { getUserProfile, updateUserProfile } from "../../services/user";
import { uploadFile } from "../../services/upload";
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
        try {
          const me = await getUserProfile()
          wx.setStorageSync("userId", me.id)
        } catch {
          setToken("")
          wx.showToast({ title: "登录验证失败，请检查服务是否可用", icon: "none" })
          return
        }
        wx.showToast({ title: "登录成功" });
        this.goMain();
      } catch (e) {
        wx.showToast({ title: "登录失败", icon: "none" });
      } finally {
        this.setData({ logging: false });
      }
    } else {
      const { account, password } = this.data;
      if (!account || !password) {
        wx.showToast({ title: "请输入账号和密码", icon: "none" });
        return;
      }
      this.setData({ logging: true });
      try {
        const r = await loginPassword(account, password)
        setToken(r.token)
        try {
          const me = await getUserProfile()
          wx.setStorageSync("userId", me.id)
        } catch {
          setToken("")
          wx.showToast({ title: "登录验证失败，请检查服务是否可用", icon: "none" })
          return
        }
        wx.showToast({ title: "登录成功" })
        this.goMain()
      } catch (e: any) {
        if (e?.code === "PASSWORD_NOT_SET") {
          wx.showToast({ title: e?.message || "该账号未设置密码，请用验证码登录", icon: "none" })
          this.setData({
            loginType: "sms",
            account,
            password: "",
            code: ""
          })
          return
        }

        const msg = e?.message || "登录失败"
        wx.showToast({ title: msg, icon: "none" })
      } finally {
        this.setData({ logging: false })
      }
    }
  },

  async onRegister() {
    const { regUsername, regPhone, regPassword, regPasswordConfirm } = this.data;
    if (!regUsername || !regPhone || !regPassword || !regPasswordConfirm) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      wx.showToast({ title: "两次密码不一致", icon: "none" });
      return;
    }
    this.setData({ logging: true })
    try {
      const r = await registerUser(regPhone, regPassword, regUsername)
      setToken(r.token)
      try {
        const me = await getUserProfile()
        wx.setStorageSync("userId", me.id)
      } catch {
        setToken("")
        wx.showToast({ title: "注册验证失败，请检查服务是否可用", icon: "none" })
        return
      }
      wx.showToast({ title: "注册成功" })
      this.goMain()
    } catch (e: any) {
      const statusCode = e?.statusCode
      if (statusCode === 409) {
        wx.showToast({ title: "该手机号已注册，请登录", icon: "none" })
        this.setData({
          isRegister: false,
          loginType: "password",
          account: regPhone,
          password: "",
          code: ""
        })
        return
      }

      const msg = e?.message || "注册失败"
      wx.showToast({ title: msg, icon: "none" })
    } finally {
      this.setData({ logging: false })
    }
  },

  onWxLogin() {
    wx.login({
      success: async r => {
        try {
          const data = await code2Session(r.code);
          setToken(data.token);
          try {
            const me = await getUserProfile()
            wx.setStorageSync("userId", me.id)
          } catch {
          }
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
  async onChooseAvatar(e: any) {
    const localPath = e?.detail?.avatarUrl || ""
    if (typeof localPath !== "string" || !localPath) return

    const nickName = (this.data.userInfo?.nickName || "").trim()
    this.setData({
      "userInfo.avatarUrl": localPath,
      hasUserInfo: !!(nickName && localPath && localPath !== defaultAvatarUrl)
    })

    if (!/^wxfile:\/\//i.test(localPath)) return
    wx.showLoading({ title: "上传中..." })
    try {
      const url = await uploadFile(localPath)
      const nextNick = (this.data.userInfo?.nickName || "").trim()
      this.setData({
        "userInfo.avatarUrl": url,
        hasUserInfo: !!(nextNick && url && url !== defaultAvatarUrl)
      })
    } catch (err) {
      wx.showToast({ title: "头像上传失败", icon: "none" })
    } finally {
      wx.hideLoading()
    }
  },
  
  onInputChange(e: any) {
    const nickName = (e.detail.value || "").trim();
    const { avatarUrl } = this.data.userInfo;
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: !!(nickName && avatarUrl && avatarUrl !== defaultAvatarUrl),   
    });
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '展示用户信息', 
      success: async (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        try {
          const nickname = (res.userInfo?.nickName || "").trim()
          const avatarUrl = res.userInfo?.avatarUrl || ""
          if (nickname && avatarUrl) {
            await updateUserProfile({ nickname, avatarUrl })
          }
        } catch {
        }
      }
    });
  },

  async goMain() {
    if (this.data.showUserInfo) {
      if (!this.data.hasUserInfo) {
        wx.showToast({ title: "请先设置头像昵称", icon: "none" })
        return
      }
      try {
        const nickname = (this.data.userInfo?.nickName || "").trim()
        const avatarUrl = this.data.userInfo?.avatarUrl || ""
        await updateUserProfile({ nickname, avatarUrl })
        this.setData({ showUserInfo: false })
      } catch (e: any) {
        wx.showToast({ title: e?.message || "保存失败", icon: "none" })
        return
      }
    }
    wx.reLaunch({ url: '/pages/home/index' });
  }
});
