# 完整后端与数据库开发 (Flask + Supabase) Spec

## Why
当前 "PawHome"（爱宠家）项目的前端包含完整的页面UI与交互原型，但缺乏真实数据支撑与后台业务逻辑处理。为了使产品具备真实的用户认证、数据持久化存储、核心业务流程流转（如宠物管理、社区发帖、服务预约、商城购物等）能力，需要搭建稳定、安全、高性能的后端系统。本项目选择 Python Flask 结合 Supabase 作为后端技术栈，以实现快速开发和云原生支持。

## What Changes
- **新建后端工程**: 基于 Python Flask 搭建 RESTful API 服务框架，集成全局异常处理与路由。
- **数据库架构设计**: 使用 Supabase (PostgreSQL) 设计并实现完整的数据库表结构，包含用户模块、宠物模块、社区模块、商城模块、服务模块及系统配置等。
- **配置与安全策略**: 在 Supabase 中配置 Row Level Security (RLS) 策略，保障数据级安全。
- **API 开发**: 开发用户认证、业务数据 CRUD、文件上传（对接 Supabase Storage）等对应前端交互场景的所有接口。
- **中间件封装**: 实现输入校验、JWT权限校验、速率限制等中间件。
- **前后端联调接入**: 在前端统一封装网络请求层（axios/fetch），配置拦截器，解决 CORS 问题，并将原有的 mock 数据全量替换为真实接口调用。
- **测试与CI/CD**: 增加 Pytest 单元与集成测试配置，集成 CI 自动测试（如 GitHub Actions 或本地 Supabase CLI）。
- **文档与UML生成**: 生成系统 API 文档 (Swagger/OpenAPI)，并输出基于 UML 语法的 ER图、类图和时序图。

## Impact
- Affected specs: 整个项目的后端支撑能力、前端数据请求层、用户鉴权与状态管理机制。
- Affected code:
  - `backend/` (新建 Flask 后端目录)
  - `supabase/migrations/` (数据库迁移脚本)
  - `miniprogram/` 或前端项目的 `api/` 及各个页面组件 (修改数据请求逻辑)

## ADDED Requirements
### Requirement: 数据库与模型设计
系统 SHALL 包含完整的数据库设计，支持用户、宠物、社区动态、商城订单及服务预约等实体，并通过 Supabase 迁移脚本部署，且必须包含 RLS 策略。

#### Scenario: 跨租户/跨用户数据隔离
- **WHEN** 普通用户请求读取或修改数据
- **THEN** 数据库根据 RLS 策略，仅允许其访问属于自己或公开的数据。

### Requirement: RESTful API 与功能实现
系统 SHALL 基于 Flask 提供符合标准的 RESTful API 接口，并对接 Supabase-py，实现完整的业务功能闭环。

#### Scenario: 核心业务交互
- **WHEN** 前端发起业务请求（如发布社区动态、创建订单）
- **THEN** 后端进行权限校验、参数验证后，完成数据持久化操作，并返回标准化格式的数据。

### Requirement: 质量与性能达标
代码质量与系统性能 SHALL 满足严格标准：P95响应时间<500ms、数据库具备合理索引、通过OWASP Top10扫描无高危漏洞、Pylint评分≥8.5、测试覆盖率≥85%。

#### Scenario: 代码提交流程
- **WHEN** 代码推送到代码库
- **THEN** CI/CD 流程将自动运行 Pylint 和 Pytest，若指标不达标则流程失败。
