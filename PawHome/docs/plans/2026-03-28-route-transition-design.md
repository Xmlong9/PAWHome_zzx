# 页面切换转场（iOS 右推入风格）设计

## 目标

- 进入帖子、退出帖子、进入个人主页等路由切换更丝滑，风格贴近 iOS「右推入 / 右推出」
- 不依赖系统默认切页动画；在跳转前后做可控的 transform 过渡
- 覆盖代码触发的跳转与返回；系统手势返回不覆盖

## 范围

- 接入页面：post-detail、user-profile、messages、user-relations、my/history、my/favorites、chat
- 需要替换的跳转入口：
  - community/index.ts：goPostDetail / goUserProfile
  - post-detail/index.ts：goUserProfile / goBack
  - user-profile/index.ts：goPostDetail / openRelations / onMessage / goBack
  - messages/index.ts：openItem / goBack
  - user-relations/index.ts：openProfile / openChat
  - my/index.ts：goMyProfile
  - my/history/index.ts：goDetail
  - my/favorites/index.ts：goDetail

## 动画规范

- 进入（push in）
  - transform：translate3d(24rpx, 0, 0) → translate3d(0, 0, 0)
  - opacity：0 → 1
  - 时长：300ms
  - 曲线：cubic-bezier(0.22, 0.61, 0.36, 1)
- 退出（pop out）
  - transform：translate3d(0, 0, 0) → translate3d(24rpx, 0, 0)
  - opacity：1 → 0
  - 时长：240ms
  - 曲线：ease
- 性能
  - 仅使用 transform + opacity
  - will-change：transform, opacity

## 页面统一状态

每个接入页面在 data 中包含：

- pageMounted：页面是否已挂载（本实现仅用于统一初始化）
- pageVisible：是否处于“进入完成态”（用于进入动画）
- pageLeaving：是否处于“退出中”（用于退出动画）

页面行为：

- onLoad：初始化 `pageMounted=true, pageVisible=false, pageLeaving=false`
- onReady：触发进入（下一帧将 pageVisible 设为 true）
- onShow：若是从自定义返回回到该页，则重放进入动画

## 统一跳转封装

放置位置：miniprogram/utils/transition.ts

- navigateToWithTransition(url)
  - 当前页：setData 触发 leave
  - 延时 240ms 后调用 wx.navigateTo
- navigateBackWithTransition(delta?)
  - 当前页：setData 触发 leave
  - 写入标记：用于上一页 onShow 时重放 enter
  - 延时 240ms 后调用 wx.navigateBack

容错与约束：

- 若当前页不可用（无 setData），直接调用原生 wx.navigateTo/navigateBack
- 通过模块级锁避免短时间重复触发多次跳转

## 样式方案

放置位置：miniprogram/app.wxss

- 新增通用 class：paw-route + is-visible + is-leaving
- 页面根节点追加这些 class，实现统一进/退动画

## 已知限制

- iOS 系统右滑返回属于系统行为，无法完全接管为自定义动画
- 点击返回按钮、列表点击跳转、代码调用 navigateBack/navigateTo 均可覆盖并统一丝滑

