# 前端能力盘点与接口映射

本文件将现有小程序前端（`PawHome/miniprogram/`）的页面/服务层调用，与建议的后端 REST 资源进行映射，用于指导 Flask + SQLite 后端实现与前端从 Mock 切换到真实 API。

## 统一约定

- API 前缀：`/api/v1`
- 鉴权：`Authorization: Bearer <token>`
- 响应：成功返回 JSON；失败返回统一错误结构（详见后端骨架任务）。

## 页面 → 能力 → 端点

### 登录与会话

- `pages/index/index`
  - 短信：`POST /auth/sms/send`
  - 短信登录：`POST /auth/login/sms`
  - 微信 code 换 token：`POST /auth/code2session`
  - 账号密码登录（页面内 mock）：`POST /auth/login/password`
  - 退出登录（前端目前只跳转，建议补齐）：`POST /auth/logout`

### 首页

- `pages/home/index`
  - banner：`GET /banners?slot=...`
  - 社区卡片流：`GET /feeds/community?page=&pageSize=`

### 社区（帖子/详情/发布/搜索）

- `pages/community/index`
  - 帖子流：`GET /posts?page=&pageSize=&type=`
  - 收藏/取消收藏：`POST /posts/{id}/favorite`、`DELETE /posts/{id}/favorite`

- `pages/post-detail/index`
  - 帖子详情：`GET /posts/{id}`
  - 点赞/取消点赞：`POST /posts/{id}/like`、`DELETE /posts/{id}/like`
  - 收藏/取消收藏：`POST /posts/{id}/favorite`、`DELETE /posts/{id}/favorite`
  - 评论列表：`GET /posts/{postId}/comments?page=&pageSize=`
  - 发评论/回复：`POST /comments`
  - 评论点赞：`POST /comments/{id}/like`、`DELETE /comments/{id}/like`
  - 关注/取消关注：`POST /users/{userId}/follow`、`DELETE /users/{userId}/follow`

- `pages/post-create/index`（页面内 mock）
  - 发帖：`POST /posts`
  - 媒体上传（图片/视频）：`POST /uploads`

- `pages/search/index`（页面内 mock）
  - 搜索建议/热词：`GET /search/suggestions?type=post|user|product&q=`
  - 搜索帖子：`GET /search/posts?q=&sort=&page=&pageSize=`
  - 搜索用户：`GET /search/users?q=&page=&pageSize=`
  - 搜索商品：`GET /search/products?q=&page=&pageSize=`

### 消息与私信

- `pages/messages/index`
  - 会话列表：`GET /im/conversations`
  - 通知列表（页面内写死，建议补齐）：`GET /notifications?type=like|comment&page=&pageSize=`

- `pages/chat/index`
  - 消息列表：`GET /im/messages?conversationId=`
  - 标记已读：`POST /im/conversations/{conversationId}/read`
  - 发送消息：`POST /im/messages`
  - 创建会话（建议补齐，便于用户主页首次私信）：`POST /im/conversations`

### 我的（资料/设置/宠物）

- `pages/my/index`
  - 我的资料：`GET /users/me`
  - 宠物列表：`GET /users/me/pets`
  - 当前宠物详情（建议规范化）：`GET /users/me/pets/{id}`

- `pages/my/edit-profile/index`
  - 更新资料：`PUT /users/me`

- `pages/my/settings/index`
  - 读取设置：`GET /users/me/settings`
  - 更新设置：`PUT /users/me/settings`

- `pages/my/settings/pets/add/index`
  - 新增宠物：`POST /users/me/pets`
  - 更新宠物：`PUT /users/me/pets/{id}`

### 商城

- `pages/shop/index`
  - 商品列表：`GET /shop/products`
  - 收藏商品：`POST /shop/favorites/{productId}`
  - 收藏列表：`GET /shop/favorites`

- `pages/shop/detail`
  - 商品详情：`GET /shop/products/{id}`
  - 加入购物车：`POST /shop/cart`

- `pages/cart/index`
  - 购物车列表：`GET /shop/cart`
  - 更新购物车：`PATCH /shop/cart/{productId}`
  - 全选：`POST /shop/cart/check-all`
  - 清理失效：`DELETE /shop/cart/invalid`
  - 猜你喜欢（前端目前复用商品列表）：`GET /shop/products?recommend=true`

- `pages/shop/order/checkout`
  - 默认地址：`GET /users/me/addresses/default`（前端目前为 `/user/address/default`，建议统一）
  - 结算预览：`POST /shop/order/preview`
  - 提交订单：`POST /shop/order`

- `pages/shop/order/list`
  - 订单列表：`GET /shop/orders?status=`
  - 删除订单：`DELETE /shop/orders/{id}`（前端目前 mock）
  - 支付（演示用）：`POST /shop/orders/{id}/pay`
  - 确认收货：`POST /shop/orders/{id}/confirm-receipt`

- `pages/shop/favorites`
  - 收藏列表：`GET /shop/favorites`

- `pages/shop/recharge`
  - 充值档位：`GET /shop/recharge/options`
  - 充值：`POST /shop/recharge`

- `pages/shop/customer-service`
  - FAQ：`GET /shop/customer-service/faqs`

### 服务（首页入口但页面未实现）

- `pages/service/index?type=...`
  - 服务列表：`GET /services?type=`
  - 创建预约：`POST /appointments`
  - 我的预约：`GET /appointments`

## Mock 入口（优先替换点）

服务层硬编码 `MOCK=true` 的模块（需改为按环境变量/配置切换，默认走真实 API）：

- `PawHome/miniprogram/services/auth.ts`
- `PawHome/miniprogram/services/posts.ts`
- `PawHome/miniprogram/services/comments.ts`
- `PawHome/miniprogram/services/user.ts`
- `PawHome/miniprogram/services/shop.ts`
- `PawHome/miniprogram/services/im.ts`

页面内仍存在 mock 的模块（即使服务层接真也需补齐接口对接）：

- 发帖发布：`pages/post-create/index`
- 搜索页：`pages/search/index`
- 通知页：`pages/messages/index`（like/comment）
- 修改密码/绑定手机：`pages/my/settings/password`、`pages/my/settings/phone`
