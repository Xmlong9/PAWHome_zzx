# 功能说明文档（functionDescription.md）

本文件用于沉淀本项目已实现功能的“实现逻辑说明”。每当讨论某个功能的实现细节或新增/调整功能时，将对应说明追加到本文件，便于后续快速回溯。

## 书写规范

- 每个功能使用一个二级标题（`##`）。
- 说明尽量包含：入口、数据流/状态、关键分支、边界条件、相关文件。
- 只写“是什么/怎么做/为什么这样做”，避免贴大段代码。

---

## 帖子浏览数（viewCount）统计逻辑

**目的**
- 展示帖子被浏览的去重统计值（更接近 UV，而非 PV）。

**统计口径**
- `viewCount` 由后端根据 `PostHistory` 表对同一 `post_id` 的记录数计算得出。
- `(user_id, post_id)` 复合主键保证同一用户对同一帖子最多贡献 1 次浏览计数。

**增长时机**
- 访问帖子详情接口 `GET /posts/<post_id>`：
  - 若该用户首次浏览该帖：插入 `PostHistory(user_id, post_id)`，从而使 `viewCount +1`。
  - 若已浏览过：仅更新 `last_viewed_at`，不增加计数。

**哪些接口会返回 viewCount**
- 社区列表 `GET /posts` 默认不返回 `viewCount`（列表通常拿不到该字段）。
- 我的帖子 `GET /users/me/posts` 返回 `viewCount`。
- 帖子详情 `GET /posts/<post_id>`：仅作者本人查看自己帖子时返回 `viewCount`。

**前端展示方式**
- 前端不自增 `viewCount`，仅在字段存在时展示（`wx:if="{{...viewCount !== undefined}}"`）。
- 相关页面：
  - 社区列表页：时间行右侧展示浏览数（EyeOutlined 图标）。
  - 帖子详情页：时间行右侧展示浏览数（EyeOutlined 图标）。
  - 个人主页帖子卡片：展示浏览数（EyeOutlined 图标）。

**相关文件**
- 后端：
  - `backend/app/api/v1/posts.py`
  - `backend/app/models.py`
- 小程序：
  - `PawHome/miniprogram/services/posts.ts`
  - `PawHome/miniprogram/pages/post-detail/index.ts`
  - `PawHome/miniprogram/pages/post-detail/index.wxml`
  - `PawHome/miniprogram/pages/community/index.wxml`
  - `PawHome/miniprogram/pages/user-profile/index.wxml`

---

## 分享弹窗（底部 Sheet）丝滑动画

**目的**
- 让分享弹窗弹出/收起更顺滑，避免因节点首次渲染直接处于最终态而“没有过渡动画”。

**入口**
- 帖子详情页右上角“…”按钮触发打开。
- 点击遮罩或取消触发关闭。

**数据流/状态**
- `showActionPanel`：控制节点是否挂载（`wx:if`）。
- `actionPanelVisible`：控制是否添加 `.show` 类，从而触发 CSS 过渡。

**关键分支**
- 打开：先 `showActionPanel=true` 挂载面板，再短延时设置 `actionPanelVisible=true` 触发过渡。
- 关闭：先 `actionPanelVisible=false` 播放收起动画，再延时将 `showActionPanel=false` 卸载节点。

**边界条件**
- 连续快速打开/关闭：通过定时器清理避免状态抖动。

**相关文件**
- `PawHome/miniprogram/pages/post-detail/index.ts`
- `PawHome/miniprogram/pages/post-detail/index.wxml`
- `PawHome/miniprogram/pages/post-detail/index.wxss`

---

## 微信登录后昵称头像入库（含头像上传）

**目的**
- 解决微信登录后拿不到昵称、头像路径无法被其他端使用的问题：昵称由用户输入，头像先上传再写入用户资料。

**入口**
- 小程序登录成功后在首页登录页弹出“获取头像昵称”弹窗：`PawHome/miniprogram/pages/index/index`
- 后端上传接口：`POST /uploads`
- 后端用户资料更新接口：`PUT /users/me`

**数据流/状态**
- `chooseAvatar` 返回本地临时路径（`wxfile://...`）：
  - 小程序先调用上传接口换取可访问 URL，再将 URL 写入 `userInfo.avatarUrl`
- 点击“完成”：
  - 小程序调用 `updateUserProfile({ nickname, avatarUrl })` 写入后端数据库

**关键分支**
- 旧基础库兼容：`wx.getUserProfile` 走授权返回 `userInfo`，成功后同样尝试写入后端资料。

**边界条件**
- 上传失败：提示“头像上传失败”，允许用户重试选择头像。
- 未填写昵称或未选择头像：阻止完成并提示“请先设置头像昵称”。

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/index/index.ts`
  - `PawHome/miniprogram/services/upload.ts`
  - `PawHome/miniprogram/services/user.ts`
- 后端：
  - `backend/app/api/v1/uploads.py`
  - `backend/app/api/v1/users.py`

---

## 评论通知展示评论内容与帖子缩略图

**目的**
- 消息页“评论”Tab 能直接看到对方评论的内容，并在有媒体时展示帖子缩略图。

**入口**
- 小程序消息页：`PawHome/miniprogram/pages/messages/index`
- 后端通知列表：`GET /notifications`

**数据流/状态**
- 后端在通知列表中：
  - `content`：根据 `comment_id` 读取 `Comment.content`
  - `thumbUrl`：从 `Post.media_json` 解析首图或视频封面
- 小程序消息页：
  - `content` 非空时展示第三行引用文本
  - `thumbUrl` 非空时展示右侧缩略图

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/messages/index.ts`
  - `PawHome/miniprogram/pages/messages/index.wxml`
- 后端：
  - `backend/app/api/v1/notifications.py`
  - `backend/app/models.py`

---

## 帖子/评论/互动消息时间统一为北京时间输出

**目的**
- 修复帖子、评论、互动消息时间显示整体偏差（常见表现为“都晚 8 小时”）。

**实现要点**
- 后端对外输出统一按北京时间序列化：
  - `posts/comments` 的 `createdAt/updatedAt` 返回带 `+08:00` 的 ISO 字符串
  - `notifications` 的 `createdAt` 返回稳定的 epoch 毫秒时间戳

**边界条件**
- 数据库存储仍以 UTC 为准；对外输出时做时区转换，避免客户端解析无时区 ISO 字符串导致偏移。

**相关文件**
- 小程序：
  - `PawHome/miniprogram/utils/date.ts`
  - `PawHome/miniprogram/pages/community/index.ts`
  - `PawHome/miniprogram/pages/post-detail/index.ts`
  - `PawHome/miniprogram/pages/messages/index.ts`
- 后端：
  - `backend/app/timeutil.py`
  - `backend/app/api/v1/posts.py`
  - `backend/app/api/v1/comments.py`
  - `backend/app/api/v1/notifications.py`

---

## 消息页评论通知与“我评论的”分栏

**目的**
- 消息页评论 Tab 既能看“评论我的/回复我的”，也能看“我评论的”；并支持从消息快速跳到对方主页与对应帖子的评论位置。

**入口**
- 小程序消息页：`PawHome/miniprogram/pages/messages/index`
- 后端通知列表：`GET /notifications?type=comment`
- 后端我的评论列表：`GET /users/me/comments`

**数据流/状态**
- 评论 Tab 二级分栏：
  - `commentSubTab=toMe`：展示后端通知返回的评论互动（别人评论/回复我）
  - `commentSubTab=byMe`：展示“我评论的”列表（我发出的评论/回复）
- 评论卡片展示字段：
  - `text`：动作文案（如“评论了你的帖子”“回复了你的评论”）
  - `commentText`：对方（或我）实际发出的评论内容
  - `content`：引用内容（被回复的原评论，或对应帖子正文摘要）

**关键分支**
- 创建评论时后端区分：
  - 直接评论帖子：通知帖子作者，`text="评论了你的帖子"`
  - 回复评论：通知被回复评论作者，`text="回复了你的评论"`
- 点击交互：
  - 点击头像/昵称：跳转 `user-profile`（需要后端返回 `actorId/userId`）
  - 点击评论卡片：跳转帖子详情并携带 `commentId`，帖子详情通过 `scroll-into-view` 定位到对应评论节点

**边界条件**
- 若 `commentId` 缺失：仍可跳转帖子详情但不定位。
- “我评论的”列表默认加载首页分页（page=1,pageSize=20），可按需后续扩展分页/下拉刷新。

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/messages/index.ts`
  - `PawHome/miniprogram/pages/messages/index.wxml`
  - `PawHome/miniprogram/pages/messages/index.wxss`
  - `PawHome/miniprogram/services/notifications.ts`
  - `PawHome/miniprogram/services/comments.ts`
  - `PawHome/miniprogram/pages/post-detail/index.ts`
  - `PawHome/miniprogram/pages/post-detail/index.wxml`
- 后端：
  - `backend/app/api/v1/comments.py`
  - `backend/app/api/v1/notifications.py`

### 变更 2026-03-28：评论内容不展示修复（commentText 兜底）

**问题现象**
- 消息页 → 评论 → 评论我的：仅展示“评论了你的帖子/回复了你的评论”等动作文案，但看不到对方具体评论内容。

**根因**
- 历史/不完整通知数据中可能存在 `comment_id` 缺失或不稳定的情况，导致通知列表接口无法通过 `comment_id` 回查 `Comment`，从而 `commentText` 为空，前端 `wx:if="{{item.commentText}}"` 不渲染评论正文。

**修复方案**
- 后端 `GET /notifications` 对评论类通知补齐 `commentText` 回填兜底：
  - 优先使用 `comment_id` 查 `Comment.content`
  - 若 `comment_id` 不存在但具备 `post_id + actor_id`，则回查该用户在该帖的最近一条评论作为 `commentText`
  - 若仍为空，返回占位文本“（评论内容为空）”保证前端可渲染

**影响面**
- 评论我的列表将稳定展示“对方评论内容”（commentText），以及引用块展示“我的原帖/原评论内容”（content）。
