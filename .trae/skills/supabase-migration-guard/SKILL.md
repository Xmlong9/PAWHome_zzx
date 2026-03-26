---
name: supabase-migration-guard
description: Supabase 数据库迁移与建表护栏。用于执行迁移、创建/修改表、调用 supabase_apply_migration、或遇到 401/Unauthorized/valid access token 报错时，强制走“先校验集成→再迁移→失败则回退 database/query→最后校验表结构”的稳定流程。
---

## 核心要点

- `supabase_apply_migration` 依赖 Supabase 集成侧的 Management API token（Personal Access Token / `sbp_...`），不等同于 `service_role_key`，也不一定会读取项目 `.env`。
- 看到 `Unauthorized. Please provide a valid access token`：优先判定为“管理接口 token 缺失/无效/无权限”，不要把它当成数据库连不上。

## 标准流程（执行 Supabase 结构变更时）

### 1) 先确认工程绑定

- 调用 `supabase_get_project`，拿到 `project_url` 并确认不为空。

### 2) 准备迁移 SQL

- 迁移文件放在 `supabase/migrations/`，命名清晰（不要时间戳）。
- 只写 DDL（建表/改表/索引），避免写依赖业务数据的 DML。

### 3) 首选：使用 supabase_apply_migration

- 如果可用，优先使用 `supabase_apply_migration` 应用迁移文件。

### 4) 失败回退（遇到 Unauthorized 必走）

当 `supabase_apply_migration` 报 401/Unauthorized：

- 不要继续重试迁移工具；改用 Management API `database/query` 执行同一份 SQL。
- 前置条件：项目 `.env` 里必须有：
  - `SUPABASE_URL=https://<ref>.supabase.co`
  - `SUPABASE_ACCESS_TOKEN=sbp_...`

使用仓库脚本执行：

```bash
node scripts/supabase-db-query.mjs --file supabase/migrations/<migration>.sql
```

### 5) 最后校验

- 调用 `supabase_get_tables` 校验目标表是否出现、RLS 状态与列定义是否正确。

## 常见坑位速查

- `SUPABASE_SERVICE_ROLE_KEY` 不能用于 Management API（迁移/分支/项目管理等）。
- `.env` 里有 token 不代表 `supabase_apply_migration` 就能用（它可能读的是 IDE 集成配置）。
- 不要在日志/报错里打印完整 token/key。

