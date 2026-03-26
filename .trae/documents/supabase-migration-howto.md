# Supabase 迁移应用与校验（当自动迁移报 401 时）

当前环境中调用迁移接口出现：`Unauthorized. Please provide a valid access token`，说明缺少 Supabase Management API 的 Personal Access Token（`sbp_...`），它不同于 `SUPABASE_SERVICE_ROLE_KEY`。

## 1) 准备本地环境变量

在项目根目录创建 `.env`（建议仅本地使用，不要提交），写入：

```bash
SUPABASE_URL=https://krwwgpbbdhfvxihkawvu.supabase.co
SUPABASE_ACCESS_TOKEN=sbp_xxx
```

## 2) 回退路径执行 SQL（推荐）

使用仓库脚本通过 Management API 执行迁移 SQL：

```bash
node scripts/supabase-db-query.mjs --file supabase/migrations/pawhome_schema.sql
```

## 3) 校验表结构（最小验证）

迁移执行成功后，建议用 SQL Editor 或脚本做最小验证：

```bash
node scripts/supabase-db-query.mjs --query "select table_name from information_schema.tables where table_schema='public' order by table_name"
```

也可以验证 RLS 是否启用：

```bash
node scripts/supabase-db-query.mjs --query "select relname as table, relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r' order by relname"
```

## 4) 迁移文件

- 业务全量表结构与 RLS：`supabase/migrations/pawhome_schema.sql`

