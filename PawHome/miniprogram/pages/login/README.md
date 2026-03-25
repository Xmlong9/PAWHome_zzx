# 登录与启动模块说明

## 1. 启动页 (Splash)
**文件路径**：`pages/splash/index`
- 该页面为小程序的首屏页面。
- 启动页背景图默认使用 `assets/images/login/启动页.png`。
- **更换启动图**：替换 `assets/images/login/启动页.png` 文件，或在 `pages/splash/index.wxml` 中修改 `src` 路径。
- **自动跳转**：内置 2 秒倒计时，倒计时结束后自动跳转至 `pages/login/index`。右上角提供“跳过”按钮可立即跳转。

## 2. 登录与注册页 (Login)
**文件路径**：`pages/login/index`
- 整合了登录与注册双模式，移除了原有的冗余 `pages/index/index` 页面。
- 遵循了最新的 UI 设计稿规范。

### 主要功能与预留接口说明：
- **账号/手机号密码登录**：目前为本地 mock 跳转。后续对接后端时，请在 `onLogin` 方法中将 `this.data.account` 与 `this.data.password` 发送至后端登录接口。
- **微信一键登录**：已在登录页预留“微信一键登录”按钮，请在 `onWechatLogin` 中调用 `wx.login` 获取 `code` 并请求后端进行静默登录/绑定。
- **注册 - 微信昵称与头像获取**：
  - 头像使用了 `open-type="chooseAvatar"`，在 `onChooseAvatar` 中获取临时路径，后续需调用 `wx.uploadFile` 上传至服务器。
  - 昵称使用了 `type="nickname"`，键盘弹起时可直接选用微信绑定的昵称。
- **注册 - 手机号一键获取**：使用了 `open-type="getPhoneNumber"`。请在 `onGetPhoneNumber` 回调中，将 `e.detail.code` 发送至后端，后端通过微信接口换取真实手机号。
- **注册 - 获取验证码**：预留了发送验证码按钮及 60 秒倒计时逻辑。请在 `onSendCode` 中接入真实的短信下发 API。
- **协议勾选**：已实现严格校验。

## 3. 注意事项
因涉及 `type="nickname"`、`chooseAvatar` 以及 `getPhoneNumber`，请确保微信基础库版本 >= 2.21.2 以保证最佳兼容性与体验。企业主体的小程序才能获取手机号。
