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

---

## 发帖宠物标签生成（去掉宠物名字标签）

**目的**
- 发帖时选择宠物，不再自动添加“自己宠物名字”的标签；仅保留“宠物类型”和“品种”的标签。

**入口**
- 小程序发帖页：`PawHome/miniprogram/pages/post-create/index`
  - 标记宠物：`tagPet()`
  - 发布：`publish()`

**数据流/状态**
- 选择宠物后在页面状态里记录：
  - `pet`：仅用于页面显示（不再用于拼接标签）
  - `petBreed`：用于生成 `#品种` 标签
  - `petRawType`：作为类型兜底（当无法映射为猫/狗时使用）
  - `taggedPetType/petType`：用于后端 `type` 字段（帖子类型分类）
- 发布时对正文内容的拼接规则：
  - 保留原 `content` 与 `topic`
  - 追加类型标签：`#猫咪` / `#狗狗`；若无法识别则追加 `#<petRawType>`
  - 追加品种标签：`#<petBreed>`
  - 不再追加 `#<petName>`

**关键分支**
- 若用户正文/话题里已包含相同标签，则发布时不重复追加。
- 若既无猫/狗类型标签也无 `petRawType`，则不追加类型标签。

**边界条件**
- `petBreed` 为空：不生成品种标签。
- `petRawType` 为空：无法识别类型时不生成兜底类型标签。

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/post-create/index.ts`

---

## 主页热门帖子投送（Top4）与推荐流新帖置顶

**目的**
- 主页广告投送下方展示 4 条热度最高的帖子，提升内容推荐效率。
- 社区“推荐”标签下，自己 1 小时内新发帖子优先置顶，避免被旧帖淹没。

**入口**
- 后端：
  - `GET /feeds/community?mode=hot&page=1&pageSize=4`：主页热门帖子卡片数据源
  - `GET /posts?tab=recommend&type=...`：社区推荐列表（第一页包含置顶新帖）
- 小程序：
  - 主页：`PawHome/miniprogram/pages/home/index`
  - 社区：`PawHome/miniprogram/pages/community/index`

**数据流/状态**
- 主页热门帖子：
  - 后端聚合 `PostHistory` 得出浏览数（viewCount），结合 `Post.like_count/comment_count` 排序取前 4 条
  - 前端请求后渲染为 2x2 网格卡片，点击进入帖子详情
- 社区推荐置顶：
  - 后端在 `tab=recommend` 时，计算“我 1 小时内新发帖子”作为 pinned 列表
  - 返回列表顺序为：`pinned + rest`，并按该组合序列做分页，避免翻页重复

**关键分支**
- `mode=hot`：按浏览数 → 点赞数 → 评论数 → 发布时间排序
- `tab=recommend`：仅对“推荐”流启用置顶逻辑；其它 tab 仍按原规则排序

**边界条件**
- pinned 数量可能超过 pageSize：按组合序列分页，第一页只返回前 pageSize 条 pinned
- pinned 数量为 0：退化为原推荐排序

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/home/index.ts`
  - `PawHome/miniprogram/pages/home/index.wxml`
  - `PawHome/miniprogram/pages/home/index.wxss`
  - `PawHome/miniprogram/services/banners.ts`
- 后端：
  - `backend/app/api/v1/feeds.py`
  - `backend/app/api/v1/posts.py`

### 变更 2026-03-29：主页热门推送缺图随机补齐封面

**问题现象**
- 主页热门帖子（Top4）中存在 `imageUrl` 为空的帖子，导致卡片封面显示为统一的默认图，影响内容感知。

**修复方案**
- 仅在主页推送展示层做封面兜底：当 `imageUrl` 为空时，从后端静态资源 `/media/推送1.jpg~推送5.jpg` 中按 `post.id` 计算一个稳定的“随机”索引，生成 `coverUrl` 用于渲染。
- 不写回后端，不修改原帖 `media_json` 与帖子内容。

**相关文件**
- `PawHome/miniprogram/pages/home/index.ts`
- `PawHome/miniprogram/pages/home/index.wxml`

---

## 主页广告卡片与社区入口卡片防重叠布局

**目的**
- 修复首页“广告”卡片与“社区”入口卡片在视觉上贴得过近、阴影/徽标区域看起来“撞一起”的问题。

**入口**
- 小程序首页：`PawHome/miniprogram/pages/home/index`

**实现要点**
- 调整广告卡片容器 `.group1` 的底部外边距，保证阴影位移（translate）与黑色边框下方留有足够间距。
- 将社区入口卡片容器 `.group` 的顶部外边距归零，把垂直间距统一交由上一块的 `margin-bottom` 控制，避免相邻块外边距折叠带来的间距不稳定。

**边界条件**
- 兼容不同屏幕高度与字体渲染差异：通过“固定间距 + 阴影位移预留”避免视觉重叠。

**相关文件**
- `PawHome/miniprogram/pages/home/index.wxss`

### 变更 2026-03-29：首页商城广告与商城页广告统一

**目的**
- 让首页引流到商城的广告视觉与商城页顶部广告一致，避免出现两套素材。

**实现要点**
- 首页两个“去商城”的广告位（右侧竖卡 + 粉色广告卡片的无配置兜底图）统一改为使用商城页同款本地素材 `/assets/images/shop/广告.png`。

**相关文件**
- `PawHome/miniprogram/pages/home/index.wxml`
- `PawHome/miniprogram/pages/shop/index.ts`

### 变更 2026-03-29：首页商城广告改为“纯图片”展示

**目的**
- 首页商城广告位效果对齐商城页：直接渲染图片 banner，不再包裹卡片容器、阴影与边框结构。

**实现要点**
- 轮播右侧商城广告位改为单个 `<image>`（`mode="widthFix"`），用于跳转商城。
- 原首页粉色广告卡片改为单个 `<image>` banner（优先使用 `promo.imageUrl`，无配置则使用商城同款本地素材）。

**相关文件**
- `PawHome/miniprogram/pages/home/index.wxml`
- `PawHome/miniprogram/pages/home/index.wxss`

#### 回退 2026-03-29：仅保留主广告为纯图片

**说明**
- 轮播右侧“去商城”广告恢复为原卡片容器样式；仅保留主页主广告推送为纯图片 banner 展示。

### 变更 2026-03-29：首页金刚区与推送模块间距调整

**目的**
- 缩小首页金刚区（服务入口）与商城广告推送、社区推送之间的垂直留白，让内容更紧凑。

**实现要点**
- 调整 `.home-shop-hero-banner` 的上下外边距，降低金刚区到广告推送、以及广告推送到社区入口的间距。

**相关文件**
- `PawHome/miniprogram/pages/home/index.wxss`

#### 微调 2026-03-29：进一步收紧留白

**实现要点**
- 同时下调 `.services` 的 `margin-bottom` 与 `.home-shop-hero-banner` 的上下外边距，使金刚区到广告推送、广告推送到社区入口更紧凑。

---

## 评论删除按钮样式优化

**目的**
- 优化帖子详情页评论区“删除”按钮观感，避免纯文本操作项不够像可点击控件、且与其它操作不一致。

**入口**
- 帖子详情页：评论列表项右下角操作区（删除/置顶）。

**实现要点**
- 将删除操作从纯文本样式调整为胶囊按钮：增加边框、底色、圆角与可点击区域。
- 删除按钮使用危险态配色（浅红底 + 红字），并增加按下反馈（透明度变化）。

**相关文件**
- `PawHome/miniprogram/pages/post-detail/index.wxml`
- `PawHome/miniprogram/pages/post-detail/index.wxss`

### 变更 2026-03-29：删除/置顶收纳到“更多”菜单

**问题现象**
- 评论列表里直接展示“删除/置顶”文字会显得信息噪声很大，观感不够干净。

**修复方案**
- 评论操作区改为仅保留点赞与“…”更多按钮；点击“…”弹出 ActionSheet 展示可用操作：
  - 作者在自己帖子下可看到“置顶/取消置顶”
  - 可删除评论的用户看到“删除评论”

**相关文件**
- `PawHome/miniprogram/pages/post-detail/index.ts`
- `PawHome/miniprogram/pages/post-detail/index.wxml`

---

## 删除帖子（帖子弹窗入口）

**目的**
- 支持作者在帖子详情页快速删除自己发布的帖子，并自动刷新社区/个人主页相关列表。

**入口**
- 帖子详情页 → 右上角“…”打开帖子弹窗（分享弹窗）→ 操作区“删除帖子”（仅作者可见）。

**数据流/状态**
- 前端调用 `DELETE /posts/<post_id>` 删除帖子；删除成功后写入 `community_need_refresh` 与 `user_profile_need_refresh`，并返回上一页触发列表刷新。

**关键分支**
- 非作者不展示入口；后端仍会做二次校验并返回 403。
- 删除前弹出二次确认弹窗，避免误删。

**相关文件**
- `PawHome/miniprogram/pages/post-detail/index.ts`
- `PawHome/miniprogram/pages/post-detail/index.wxml`
- `PawHome/miniprogram/pages/post-detail/index.wxss`
- `PawHome/miniprogram/services/posts.ts`
- `backend/app/api/v1/posts.py`

---

## 关注状态同步（从帖子页进入个人主页）

**目的**
- 修复“在帖子里关注用户后，进入其个人主页仍显示未关注”的状态不同步问题。

**根因**
- 个人主页页内 `isFollowing` 未从接口返回结果初始化，默认值始终为 `false`。
- 后端 `GET /users/<id>` profile 未返回“我是否关注 TA”的关系字段，前端无法正确赋值。

**修复方案**
- 后端用户资料返回补充 `isFollowing/isFollowed`（基于 `follows` 表判断）。
- 小程序个人主页在 `initPage/onShow` 刷新时从 `userInfo.isFollowing` 初始化/更新 `isFollowing`。
- 帖子详情页关注/取关成功后写入 `user_profile_need_refresh`，保证返回后页面可刷新。

**相关文件**
- 后端：`backend/app/api/v1/users.py`
- 小程序：`PawHome/miniprogram/pages/user-profile/index.ts`
- 小程序：`PawHome/miniprogram/services/user.ts`
- 小程序：`PawHome/miniprogram/pages/post-detail/index.ts`

---

## 视频帖详情页空白显示修复

**问题现象**
- 视频帖子进入帖子详情页后，媒体区域显示空白（无视频画面/控件）。

**根因**
- 视频节点复用 `.swiper-img { height: 100% }` 样式，但视频容器未设置明确高度，导致高度计算为 0。

**修复方案**
- 视频容器与 `<video>` 节点按 `mediaHeight` 设置固定高度（与图片轮播一致的高度策略），保证可见并可播放。

**相关文件**
- `PawHome/miniprogram/pages/post-detail/index.wxml`
- `PawHome/miniprogram/pages/post-detail/index.ts`

### 变更 2026-03-29：视频按比例自适应与白底

**目的**
- 视频帖子展示尽量贴合视频本身比例，避免黑边；同时让留白背景统一为白色，观感更干净。

**实现要点**
- 监听 `<video>` 的 `loadedmetadata`，根据 `width/height` 计算建议高度并更新 `mediaHeight`（做最小/最大高度限制）。
- 视频容器与视频节点背景统一为白色（`mediaBgColor = #ffffff`）。
- 打开 `show-mute-btn` 方便用户快速确认/切换静音状态；播放失败时提示 toast。

### 变更 2026-03-29：视频封面缩略图兜底（发帖页/社区列表）

**问题现象**
- 发帖页选择视频后缩略图区域空白；社区列表中视频帖无封面时卡片不展示媒体区，观感不完整。

**修复方案**
- 发帖页视频缩略图优先展示 `thumbTempFilePath`，拿不到则显示占位图。
- 社区列表媒体区判断增加 `videoUrl`，当视频帖无 `images[0]` 时使用占位图并叠加播放角标。

**相关文件**
- `PawHome/miniprogram/pages/post-create/index.wxml`
- `PawHome/miniprogram/pages/community/index.wxml`
- `PawHome/miniprogram/pages/community/index.wxss`

### 变更 2026-03-29：视频封面懒生成写回（打开帖子自动补齐）

**需求**
- 对历史/异常数据：视频帖没有 `coverUrl` 时，社区列表只能显示占位图；希望在用户点进帖子后自动生成封面并写回，后续列表展示为真实封面。

**实现方案**
- 后端新增 `POST /posts/<post_id>/cover`：
  - 若视频帖已有 `coverUrl`：直接返回
  - 若缺失：从本地 `instance/uploads` 的视频文件抽帧生成 jpg，写回 `Post.media_json.coverUrl` 并返回 `coverUrl`（优先使用 OpenCV；否则使用 `imageio-ffmpeg` 调用 ffmpeg）
- 前端帖子详情页在加载视频帖且封面缺失时调用该接口；成功后更新 `post.images[0]`，并置位 `community_need_refresh` 触发返回列表刷新。

**相关文件**
- 后端：`backend/app/api/v1/posts.py`
- 后端：`backend/requirements.txt`
- 小程序：`PawHome/miniprogram/services/posts.ts`
- 小程序：`PawHome/miniprogram/pages/post-detail/index.ts`

---

## 私信（聊天）页：REST 轮询实时收消息

**目的**
- 支持用户之间私信对话：可进入会话、发送文本消息、并在仅有 REST 接口时通过轮询实现“实时收消息”体验。

**入口**
- 消息页私信列表进入：`PawHome/miniprogram/pages/messages/index`
- 个人主页私信按钮进入：`PawHome/miniprogram/pages/user-profile/index`
- 聊天页：`PawHome/miniprogram/pages/chat/index`

**数据流/状态**
- 会话创建：
  - 若路由参数未带 `id` 但带 `peerId`，聊天页会调用 `createConversation(peerId)` 获取 `conversationId` 后再拉取消息与发送。
- 消息拉取与展示：
  - 进入页后先 `listMessages(conversationId)` 拉取消息并映射为 UI 消息（区分 me/them）。
  - `onShow`/进入页后启动轮询：周期性调用 `listMessages(conversationId)` 拉取最新列表。
  - 消息合并：将服务端消息与本地乐观消息（pending/failed）做去重合并，避免轮询刷新导致丢失或闪动。
- 已读同步：
  - 进入会话与收到对端新消息后调用 `markConversationRead(conversationId)`，用于清空未读并让消息页汇总展示保持一致。

**关键分支**
- 发送消息采用乐观更新：先插入 `pending`，发送成功后用返回结果回填 `id/status`；失败标记 `failed` 并提示。
- 轮询仅在聊天页可见时运行：`onHide/onUnload` 停止，避免后台无效请求。

**边界条件**
- 若后端未回传 `clientMsgId`：前端会对“我发送的本地消息”做弱去重（文本一致且时间接近）降低重复概率。
- 会话未就绪时发送：阻止发送并提示“会话未就绪”。

**相关文件**
- `PawHome/miniprogram/pages/chat/index.ts`
- `PawHome/miniprogram/pages/chat/index.wxml`
- `PawHome/miniprogram/pages/chat/index.wxss`
- `PawHome/miniprogram/services/im.ts`

### 变更 2026-03-29：修复输入框被页面顶部 padding 挤出视口

**问题现象**
- 聊天页能看到空态/消息列表，但底部发送输入栏不显示。

**根因**
- 页面根容器设置了 `height: 100vh` 同时叠加 `padding-top`，在部分环境下会导致底部内容被裁切；叠加页面转场使用 `transform` 时，`position: fixed` 也可能变为相对该容器定位，进一步放大了裁切问题。

**修复方案**
- 将聊天页根容器设为 `box-sizing: border-box`，使 `padding-top` 纳入 100vh 计算，并设置 `position: relative` 以稳定绝对定位子元素的参考坐标。

### 变更 2026-03-29：私信时间统一按北京时间与消息页返回修复

**问题现象**
- 私信列表时间显示与预期不一致（常见于后端返回无时区的时间字符串时，解析偏差 8 小时）。
- 从社区进入消息页 → 进入私信会话 → 返回到消息页后，再返回可能回到私信页而非社区页。

**修复方案**
- 时间：IM 时间字段兼容秒/毫秒时间戳与无时区字符串，并将日期展示固定按北京时间计算。
- 返回：消息页返回统一 `switchTab` 回到社区首页，避免误回到私信页或帖子详情页。

### 变更 2026-03-29：私信时间仍偏差与聊天页自己的头像不正确修复

**问题现象**
- 部分后端返回无时区时间字符串时，私信时间仍可能固定偏差 8 小时（常见于后端实际输出为 UTC 但未带 `Z/+08:00`）。
- 聊天页右侧“自己”的头像使用了占位图，而不是数据库里存的头像。

**修复方案**
- 时间：无时区时间字符串默认按 UTC 解析；若解析结果明显落在未来（超过 5 分钟），则回退按北京时间解析，兼容不同后端输出习惯。
- 头像：聊天页启动时调用 `getUserProfile()` 获取当前用户资料，并用返回的 `avatarUrl` 作为自己的头像。

### 变更 2026-03-29：新会话首条消息发送失败修复

**问题现象**
- 第一次进入某个用户的私信会话时，首条消息容易发送失败；第二条开始恢复正常。

**根因**
- App 启动阶段 `token` 写入 storage 是异步的；在 token 尚未就绪时调用 IM 后端接口会失败。
- 会话 id 创建失败时，非 Mock 模式下不应使用本地 `conv_mock_*` 兜底 id 去调用真实后端。

**修复方案**
- 非 Mock 模式：发送/建会话前等待 token 就绪（短轮询等待），token 仍不存在则提示“登录中，请稍后”并阻止发送。
- 仅在 Mock 模式下才允许使用 `conv_mock_*` 作为兜底会话 id。

### 变更 2026-03-29：首条消息入库但页面不显示、头像空值与个人资料生日可选

**问题现象**
- 新开启私信时，首条消息已成功写入数据库，但聊天页列表不显示（第二条开始正常）。
- 用户未设置头像时，聊天页会显示默认网络头像而非空白占位。
- 编辑个人资料时生日不填写会导致保存失败。

**根因**
- 聊天页 `onLoad` 与用户快速发送同时触发建会话，可能拿到两个不同的 `conversationId`，导致消息写入 A 会话但页面展示 B 会话。
- 聊天页为自己的头像设置了默认兜底图。
- 个人资料保存时把 `birthday=""` 作为字段提交，后端校验不通过。

**修复方案**
- 会话：聊天页引入单例 `ensureConversationId()`，统一创建/复用会话，避免并发建会话导致错会话。
- 头像：头像为空时显示空白圆形占位，不再使用默认网络头像兜底。
- 资料保存：仅提交用户实际填写的字段（生日为空时不提交该字段）。

### 变更 2026-03-29：发送成功后强制刷新消息列表（兜底）

**目的**
- 避免在极端时序（setData/轮询/建会话）下出现“消息已入库但本地列表未及时合并”的展示不一致。

**实现要点**
- `onLoad` 使用 `ensureConversationId()` 的返回值作为入参拉取消息，避免依赖 `setData` 时序。
- `sendMessage` 成功后额外 `loadMessages(conversationId)` 以服务端结果为准刷新列表。

### 变更 2026-03-29：聊天消息渲染使用稳定 key

**问题现象**
- 在特定情况下（尤其首条消息发送后），消息已写入数据库且接口返回正常，但页面列表可能丢失/只显示后续消息。

**根因**
- 消息列表渲染使用 `wx:key="id"`，而“我方乐观消息”的 `id` 会在发送成功后从 `clientMsgId` 替换为后端返回的真实 `id`，导致 key 发生变化；在微信小程序列表 diff 场景下可能触发节点复用异常，表现为某些消息不渲染。

**修复方案**
- 给每条消息增加稳定的渲染 key：服务端消息用 `id`，乐观消息用 `clientMsgId`，列表使用 `wx:key="renderKey"`，即使消息真实 `id` 更新也不会改变渲染 key。

### 变更 2026-03-29：服务端消息列表以远端为准渲染

**问题现象**
- 服务端接口已返回多条消息，但页面偶发只展示最新一条。

**修复方案**
- 聊天页渲染以服务端消息列表为主（完整覆盖），仅保留本地 `pending/failed` 且服务端未出现的消息作为补充，避免本地合并逻辑导致列表异常。

### 变更 2026-03-29：滚动到底部改为 scrollTop

**问题现象**
- 空会话发出第一条消息后，空态消失但消息也看不到，页面呈现空白；继续发第二条后才“看起来正常”。

**根因**
- 使用 `scroll-into-view` 滚动到锚点时，锚点可能会对齐到视口顶部；当消息数量很少时，实际消息节点会被滚动到视口上方而不可见。

**修复方案**
- 改用 `scroll-top` 设置一个足够大的值（并用 2 个值交替触发更新）来保证滚动到底部，不依赖锚点对齐行为。

### 变更 2026-03-29：首条私信“不可见引导消息”兜底

**背景**
- 在部分环境下，新会话发送第一条消息后，页面可能出现“空白/不展示第一条”的体验问题。

**兜底策略**
- 若检测到该会话当前无历史消息，则在用户发送第一条真实消息前，先向同一会话发送一条“引导消息”，用于触发对话进入稳定状态；随后立刻发送用户真实消息。
- 引导消息内容可配置：默认使用“默认消息”用于联调排查（可改回不可见字符）。

### 变更 2026-03-29：私信时间修复与聊天页时间格式

**问题现象**
- 消息页私信列表出现“8小时前”等不符合实际的时间（刚发起会话也显示很久以前）。
- 聊天页缺少每条消息的具体发送时间展示。

**根因**
- 后端使用无时区 `datetime` 直接调用 `timestamp()`，会按服务器本地时区解释，导致 epoch 毫秒值偏差 8 小时。

**修复方案**
- 后端 IM：无时区 `datetime` 按 UTC 处理后再计算 epoch 毫秒时间戳，避免偏差。
- 小程序聊天页：按北京时间展示消息时间：
  - 当天：`HH:mm`
  - 非当天但同年：`MM-DD HH:mm`
  - 非同年：`YYYY-MM-DD HH:mm`

### 变更 2026-03-29：聊天页去掉空态文案

**目的**
- 私信页在无历史消息时也保持“纯对话界面”，不展示居中文案，减少干扰。

**实现要点**
- 移除聊天页消息列表的空态节点，仅保留消息列表与输入栏。

---

## 私信未读数与社区红点提示

**目的**
- 当有人给我发私信时，社区页左上角信封图标能出现红点提示未读。
- 打开会话后能正确清空未读，避免红点长期不消失。

**入口**
- 社区页：`PawHome/miniprogram/pages/community/index`
- 消息页（私信列表）：`PawHome/miniprogram/pages/messages/index`
- 聊天页（会话已读）：`PawHome/miniprogram/pages/chat/index`
- 后端会话列表：`GET /im/conversations`
- 后端标记已读：`POST /im/conversations/<conversation_id>/read`

**数据流/状态**
- 后端新增会话已读状态表：`IMConversationRead(conversation_id, user_id, last_read_at)`
- 会话列表返回 `unreadCount`：
  - 统计该用户在该会话中 `created_at > last_read_at` 且 `sender_id != user_id` 的消息条数
- 前端红点来源：
  - 社区页聚合 `notifications/unread-summary.total + 私信会话 unreadCount 总和`，大于 0 则显示红点

**关键分支**
- 进入聊天页/轮询收到对端新消息：调用 `markConversationRead(conversationId)` 写入 `last_read_at`，从而清空未读。
- 社区页可见时启用轻量轮询刷新红点（默认 15s），避免停留在社区页时红点不更新。

**边界条件**
- 服务端尚未建表：启动后端时执行 `db.create_all()` 自动补齐缺失表（不影响已有数据）。

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/community/index.ts`
  - `PawHome/miniprogram/services/im.ts`
  - `PawHome/miniprogram/pages/chat/index.ts`
- 后端：
  - `backend/app/models.py`
  - `backend/app/api/v1/im.py`
  - `backend/run.py`

### 变更 2026-03-29：不自动建表（避免改动真实数据库）

**目的**
- 避免后端启动时对真实数据库执行任何自动建表写入。

**实现要点**
- 移除 `backend/run.py` 中的 `db.create_all()`；数据库结构变更改为手动执行初始化脚本或迁移流程。

---

## 帖子可见性（全部可见/仅关注可见/仅自己可见）

**目的**
- 让发帖时设置的可见性真实生效：仅自己可见的帖子不应被其他用户在列表/主页/搜索/详情中看到。

**可见性规则**
- `public`：所有登录用户可见。
- `followers`：仅作者本人 + 关注作者的用户可见。
- `private`：仅作者本人可见。

**入口**
- 列表：`GET /posts`
- 用户主页帖子列表：`GET /users/<user_id>/posts`
- 详情：`GET /posts/<post_id>`
- 首页/社区投送：`GET /feeds/community`
- 搜索：`GET /search/posts`

**实现要点**
- 后端读取侧统一过滤：
  - 始终允许作者本人看到自己的所有帖子
  - 其他用户只能看到 `public`，以及在已关注作者时看到 `followers`
  - `private`（及未知 visibility 值）对非作者不可见
- 交互接口（点赞/收藏/分享等）在读取帖子时同样做可见性校验，避免通过已知 id 绕过。

**相关文件**
- 后端：
  - `backend/app/api/v1/posts.py`
  - `backend/app/api/v1/feeds.py`
  - `backend/app/api/v1/search.py`

#### 回退 2026-03-29：恢复聊天页空态文案

**说明**
- 仍保留 `scrollTop` 方案用于稳定滚动，但恢复空会话时的居中提示文案。
