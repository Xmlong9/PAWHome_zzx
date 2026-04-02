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
- 数据库文件路径可通过 `DB_PATH` 指定；默认写入 `server/data/dev.sqlite`。
- 默认管理员账号：`admin`，默认密码：`admin123`（仅用于本地开发示例）。

相关文件
- 后端：`server/src/index.ts`、`server/src/migrate.ts`、`server/src/seed.ts`、`server/src/db.ts`、`server/src/auth.ts`、`server/.env.example`
- 前端：`src/main.ts`、`src/utils/format.ts`、`src/views/**`（Dashboard/User/Post/Comment/Product/Order/Appointment/Admin/AuditLogs）

