***

name: supabase-migration-guard
description: Supabase 数据库变更/迁移护栏。用于创建表、改表、应用迁移（supabase_apply_migration）时，避免出现 “Unauthorized. Please provide a valid access token”。标准化流程：先校验工程已绑定 Supabase、确认 Access Token 来源、若迁移接口 401 则自动回退到 Management API `database/query` 执行 SQL 并再次校验表结构。
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 目标

在 PawHome 工程内进行 Supabase 相关数据库操作时，保证：

- 能稳定创建/修改表结构，不因 IDE 集成 token 缺失导致中断
- 401/Unauthorized 时有明确的排障与兜底路径
- 不在日志/代码里泄露任何密钥

## 适用范围

当出现以下任一情况时，必须遵循本护栏：

- 使用 `supabase_apply_migration` 应用 `supabase/migrations/*.sql`
- 在 Supabase 里“新建表/改表/加列/加索引”等结构变更
- 报错包含：`Unauthorized` / `valid access token` / `401`

## 标准操作流程（必须逐步执行）

### 1) 先确认工程与 Supabase 已绑定

- 优先调用 `supabase_get_project` 获取 `project_url`/keys，确认集成可用

### 2) 明确两类 Token 的用途（不要混用）

- `SUPABASE_SERVICE_ROLE_KEY`：用于后端访问 PostgREST/Storage（不等价于管理接口 token）
- `SUPABASE_ACCESS_TOKEN`（通常 `sbp_...`）：用于 Supabase Management API（管理/迁移/数据库查询等）

### 3) 应用迁移的首选路径

- 若 `supabase_apply_migration` 可用：优先使用它（能形成明确的迁移记录）

### 4) 处理 Unauthorized（核心护栏）

当 `supabase_apply_migration` 报：`Unauthorized. Please provide a valid access token`：

- 结论：IDE/集成侧没有可用的 Management API token（它通常不读取项目 `.env`）
- 处理：
  - 先在 IDE Supabase 集成里重新登录/粘贴有效 PAT（Personal Access Token）
  - 若仍不通或需要立刻推进：使用 Management API `database/query` 作为回退执行 SQL

### 5) 回退执行 SQL 后必须再校验

- 通过读取 `public` schema 表结构确认目标表/字段已生效（例如调用 `supabase_get_tables`）

## 推荐兜底工具（本仓库）

- 使用 `scripts/supabase-db-query.mjs` 执行 `database/query`：
  - `node scripts/supabase-db-query.mjs --query "select 1"`
  - `node scripts/supabase-db-query.mjs --file supabase/migrations/<name>.sql`

