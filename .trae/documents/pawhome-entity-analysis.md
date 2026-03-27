# PawHome 实体梳理（基于现有前端与原型）

## 代码来源与证据点

* 小程序页面：`PawHome/miniprogram/pages/**`（社区、商城、我的、消息/聊天等）

* 小程序服务层：`PawHome/miniprogram/services/**`（接口契约与数据结构）

* 既有 UML/表设计参考：`输出文档/ER-图.puml`、`输出文档/UML-类图.puml`、`输出文档/数据库表设计.sql`

## 核心业务域与实体

### 1) 用户与权限域

* `profiles`：用户公开资料（昵称、头像、地区、签名、性别、生日、微信 openid/unionid 等）。

* `user_settings`：用户隐私与通知设置（主页可见、评论权限、推送/互动通知等）。

* `roles` / `user_roles`：角色与用户角色绑定（预留后台管理/风控能力）。

* `ban_list` / `risk_events` / `audit_logs`：安全风控与审计。

关系：

* `profiles (1) -> (N) pets/posts/comments/orders/appointments/...`

* `profiles (N) <-> (N) roles`（通过 `user_roles`）

### 2) 宠物域

* `pets`：用户宠物档案（昵称、头像、品种、体重、绝育、生日等）。

关系：

* `profiles (1) -> (N) pets`

### 3) 社区域（帖子/评论/互动）

* `posts`：动态/帖子（内容、图片、可见性、状态、计数）。

* `post_media`：帖子媒体（图/视频 URL、排序）。

* `topics` / `tags`：话题与标签。

* `post_topics` / `post_tags`：帖子与话题/标签的多对多关联。

* `comments`：评论（支持 parent\_id 做回复链）。

* `post_likes` / `post_favorites` / `comment_likes`：点赞/收藏关系。

* `follows`：关注关系。

* `histories`：浏览历史（面向“我的-历史/足迹”等）。

关系：

* `profiles (1) -> (N) posts/comments`

* `posts (1) -> (N) post_media/comments`

* `posts (N) <-> (N) tags/topics`

* `profiles (N) <-> (N) profiles`（通过 `follows`）

### 4) IM 私信域

* `dm_conversations`：私信会话（两人会话，维护最近消息与未读）。

* `dm_messages`：私信消息。

* `notifications`：互动提醒/系统通知。

关系：

* `dm_conversations (1) -> (N) dm_messages`

* `profiles (1) -> (N) notifications`

### 5) 商城域

从 `services/shop.ts` 可反推出：商品、收藏、购物车、地址、订单、支付、退款、评价、优惠券、余额充值等。

* `categories` / `brands`：商品分类/品牌。

* `products`：商品 SPU（封面、描述、状态、销量、评分）。

* `skus`：商品 SKU（规格、价格、库存）。

* `product_favorites`：商品收藏。

* `carts` / `cart_items`：购物车与条目。

* `addresses`：收货地址。

* `orders` / `order_items`：订单与条目。

* `payments` / `refunds`：支付与退款记录。

* `reviews`：商品评价。

* `coupons` / `coupon_claims`：优惠券与领取记录。

* `wallet_accounts` / `wallet_transactions` / `recharge_options`：钱包余额与充值。

* `faqs`：客服常见问题。

### 6) 服务预约域（医疗/美容/寄养等）

参考 UI 设计与 `输出文档/数据库表设计.sql`：

* `service_orgs`：服务机构（地理位置/电话）。

* `service_types`：服务类型（疫苗/美容/医疗等）。

* `service_items`：服务项目（价格、时长）。

* `schedules`：排班（开始/结束/名额）。

* `appointments`：预约。

* `service_orders`：预约对应订单。

* `service_records`：服务记录。

* `ratings`：对服务/帖子等的评分。

### 7) 系统配置与运营域

* `config_kv`：站点配置键值。

* `banner_slots` / `banner_items`：首页运营投放位与素材。

* `community_cards`：社区推荐卡片素材。

## 身份与权限（Supabase 模式）

* 登录用户身份以 `auth.users.id (uuid)` 为唯一主键；业务侧使用 `public.profiles.id` 与其一一对应。

* 数据访问采用 RLS：

  * **公开读**：如商品、banner、公开帖子、服务机构等，允许 `anon` 与 `authenticated` 读取。

  * **用户私有**：如设置、宠物、购物车、订单、地址、私信等，仅允许 `auth.uid()` 访问自己的数据。

  * **社交关系约束**：如帖子 `followers` 可见，需通过 `follows` 判断。

