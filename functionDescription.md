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
