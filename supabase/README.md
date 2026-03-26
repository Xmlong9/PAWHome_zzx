# Supabase

本目录用于存放 Supabase 数据库迁移文件（`supabase/migrations/*.sql`）。

## 迁移文件

- `supabase/migrations/initial_schema.sql`：初始化扩展与 `public.health_checks` 表。

## 如何应用迁移

如果当前环境无法通过自动化方式执行迁移，可以在 Supabase Dashboard 的 SQL Editor 中手动执行对应 `.sql` 文件内容。

