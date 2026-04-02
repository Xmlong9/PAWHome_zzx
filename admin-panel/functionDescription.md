## 管理端前后端与数据库打通

目的
- 为 `admin-panel` 提供可本地运行的管理端后端 API 与 SQLite 数据库，并让前端页面通过统一鉴权请求读取真实数据。

入口
- 前端：`src/main.ts` 中为 `axios` 注入 `Authorization` 请求头与 `401` 统一跳转逻辑。
- 后端：`server/src/index.ts` 监听 `PORT`（默认 `5001`），对外提供 `/api/v1/admin/**` 接口。

数据流与状态
- 登录：`src/views/Login.vue` 调用 `POST /api/v1/admin/auth/login` 获取 `token` 与管理员信息；前端写入 `localStorage(admin_token/admin_info)`。
- 鉴权：`src/main.ts` 的 `axios` request interceptor 自动为所有请求附加 `Bearer <token>`；后端 `requireAuth` 校验 JWT。
- 列表与看板：页面在 `onMounted` 调用对应接口，后端从 SQLite 读取并返回统一分页结构 `data: { items, page, pageSize, total }`。

关键分支
- 未登录或 token 过期：后端返回 `401`；前端拦截后清理本地登录态并跳转 `/login`。
- 本地首次启动：后端执行 `migrate()` 建表与 `seed()` 填充默认管理员与演示数据。

边界条件
- 数据库文件路径可通过 `DB_PATH` 指定；默认写入 `../../backend/instance/app.db`，从而直接连接到后端的真实数据库。
- 默认管理员账号：`admin`，默认密码：`admin123`（仅用于本地开发示例）。

相关文件
- 后端：`server/src/index.ts`、`server/src/migrate.ts`、`server/src/seed.ts`、`server/src/db.ts`、`server/src/auth.ts`、`server/.env.example`
- 前端：`src/main.ts`、`src/utils/format.ts`、`src/views/**`（Dashboard/User/Post/Comment/Product/Order/Appointment/Admin/AuditLogs）

## 管理端用户、帖子与评论管理完善

目的
- 实现管理端用户管理（编辑、封禁，活跃用户/认真宠主标签）、帖子管理（详情查看、编辑、删除）以及评论管理（删除）功能。

入口
- 用户管理：`src/views/users/UserList.vue` 的列表操作列及用户昵称下方标签。
- 帖子管理：`src/views/content/PostList.vue` 的列表操作列。
- 评论管理：`src/views/content/CommentList.vue` 的列表操作列。
- 后端 API：`server/src/index.ts` 中的 `PUT /api/v1/admin/users/:id`、`PUT /api/v1/admin/users/:id/status`、`PUT /api/v1/admin/posts/:id`、`DELETE /api/v1/admin/posts/:id`、`DELETE /api/v1/admin/comments/:id` 以及对应的 GET 查询接口和 Dashboard Stats 接口。

数据流与状态
- 标签判定：
  - 活跃用户：后端在查询用户列表时，计算用户的发帖数、评论数以及收到的点赞数总和，若大于0则前端显示“活跃用户”。
  - 认真宠主：后端在查询用户列表时，关联统计 `pets` 表中该用户绑定的宠物数量，若大于0则前端显示“认真宠主”。
- 操作流：前端触发操作（如编辑、封禁、删除）时，调用对应的 Axios API 向后端发送请求，后端通过 SQLite 执行相应的 UPDATE/DELETE 语句，前端收到成功响应后重新调用 `load()` 刷新列表。

关键分支
- 删除帖子：后端需要先删除关联的评论（`DELETE FROM comments WHERE post_id = ?`），然后再删除帖子记录，以防外键约束冲突。
- 封禁用户：通过 `toggleBan` 切换用户的 `status` 状态为 `active` 或 `banned`。

边界条件
- 没有宠物的用户不会显示“认真宠主”标签，没有互动数据的用户不会显示“活跃用户”标签。
- 考虑到数据的一致性，SQLite 配置了 `PRAGMA foreign_keys = ON;`，所以需要级联删除或手动先删子表记录。

相关文件
- 后端：`server/src/index.ts`、`server/src/migrate.ts`、`server/src/seed.ts`
- 前端：`src/views/users/UserList.vue`、`src/views/content/PostList.vue`、`src/views/content/CommentList.vue`

## 管理端商品管理功能完善

目的
- 实现商品管理模块的商品新增、修改、下架、批量下架和删除功能，区分“下架”与“删除”的不同业务逻辑。

入口
- 前端：`src/views/shop/ProductList.vue`
- 后端 API：`server/src/index.ts` 中的 `POST /api/v1/admin/shop/products`、`PUT /api/v1/admin/shop/products/:id`、`PUT /api/v1/admin/shop/products/:id/status`、`POST /api/v1/admin/shop/products/batch-status`、`DELETE /api/v1/admin/shop/products/:id`、`GET /api/v1/admin/shop/products/summary`。

数据流与状态
- 批量下架：前端勾选多项商品后，点击“批量下架”调用 `batch-status` 接口，将选中商品的 `status` 变更为 `off_sale`。
- 删除商品：点击列表中的“删除”按钮，调用 `DELETE` 接口，若商品有关联订单，则后端校验不通过并提示，否则直接物理删除。
- 商品状态逻辑：`status` 字段由后端基于前端传入的 `is_active` 和商品的 `stock_qty`（库存）计算得出，取值为 `on_sale`、`low_stock`（库存小于100）、`off_sale`。

关键分支
- 下架 vs 删除：下架仅变更 `status` 为 `off_sale`，商品数据依然保留且可以再次上架；删除则执行 `DELETE FROM products`，并前置检查是否有订单关联。
- 数据统计：增加了 `products/summary` 接口，计算商品总数、实时库存、在售状态以及本月新增等信息，供页面顶部 Bento 统计卡片使用。

边界条件
- 若商品已被 `order_items` 引用，删除操作会失败并提示“商品已有订单记录，不能删除，请使用下架功能”。
- 库存为0时自动置为 `off_sale` 状态；库存大于0且小于100时置为 `low_stock`。

相关文件
- 后端：`server/src/index.ts`
- 前端：`src/views/shop/ProductList.vue`

## 管理端订单与预约管理完善

目的
- 为订单和预约列表提供查询、筛选以及数据导出功能，增强数据管理能力；在全局布局中提供搜索入口提示。

入口
- 订单管理：`src/views/shop/OrderList.vue` 的搜索表单（订单号、收货人、状态）与“导出数据”按钮。
- 预约管理：`src/views/services/AppointmentList.vue` 的服务类型筛选与“导出报表”按钮。
- 全局搜索：`src/layout/Layout.vue` 顶部的搜索框。
- 后端 API：`GET /api/v1/admin/shop/orders` 和 `GET /api/v1/admin/services/appointments` 增加了查询参数支持；新增 `GET /api/v1/admin/shop/orders/export` 和 `GET /api/v1/admin/services/appointments/export`。

数据流与状态
- 列表查询：前端通过 `v-model` 绑定查询条件，点击“查询”或切换分类时，将参数（如 `q`, `name`, `status`, `serviceType`）追加到 URL query 请求后端，后端动态拼接 SQL 的 `WHERE` 条件。
- 报表导出：前端将当前查询条件序列化后调用对应的 `export` 接口，后端查询全量符合条件的数据并拼装为 CSV 格式返回，前端通过创建 `<a>` 标签触发浏览器下载。
- 视图切换与全局搜索：预约管理的日历视图目前为“占位状态”，切换时显示提示 UI；全局搜索框输入回车后会弹出正在开发中的提示。

关键分支
- 动态 SQL 拼接：后端在处理带查询条件的列表请求时，使用 `1=1` 作为基础条件，并根据入参动态 `push` 条件与对应参数，防止 SQL 注入。
- 导出格式：CSV 文件需要以 `\uFEFF` 开头（BOM）来防止 Excel 打开时出现中文乱码，并且需要对状态等枚举值做中文映射。

边界条件
- 导出时不再分页，而是直接拉取所有匹配条件的数据，以便导出完整报表。

相关文件
- 后端：`server/src/index.ts`
- 前端：`src/views/shop/OrderList.vue`、`src/views/services/AppointmentList.vue`、`src/layout/Layout.vue`

