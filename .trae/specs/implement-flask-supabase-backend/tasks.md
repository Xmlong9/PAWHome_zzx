# Tasks

- [x] Task 1: 数据库与系统架构设计
  - [x] SubTask 1.1: 全面分析前端 UI 与原型，梳理业务实体，输出系统的 ER 图、类图与核心时序图（UML 代码）。
  - [x] SubTask 1.2: 设计具体的数据库表结构（用户表、宠物表、社区动态表、商品/订单表、服务预约表、系统配置表），明确字段、类型与索引。
  - [x] SubTask 1.3: 编写 Supabase 数据库迁移 SQL 文件（`supabase/migrations/`），包含所有表的创建、外键约束与 RLS 策略定义。
  - [x] SubTask 1.4: 执行数据库迁移，初始化 Supabase 项目结构。

- [x] Task 2: Flask 后端基础工程搭建
  - [x] SubTask 2.1: 初始化 Flask 项目，配置 `requirements.txt`，集成 `supabase-py`。
  - [x] SubTask 2.2: 搭建项目基础结构（路由、控制器、服务层、统一配置）。
  - [x] SubTask 2.3: 实现全局中间件：统一响应格式封装、全局异常错误处理。
  - [x] SubTask 2.4: 实现安全与控制中间件：输入校验、JWT/Supabase 权限校验、接口速率限制。

- [x] Task 3: 后端核心业务 API 开发
  - [x] SubTask 3.1: 开发用户认证模块接口（注册、登录、登出、Token刷新）。
  - [x] SubTask 3.2: 开发用户与宠物模块接口（用户资料管理、宠物信息 CRUD）。
  - [x] SubTask 3.3: 开发社区模块接口（帖子发布、评论、点赞，含分页与筛选）。
  - [x] SubTask 3.4: 开发商城与服务模块接口（商品列表、购物车、订单创建与查询、服务预约）。
  - [x] SubTask 3.5: 对接 Supabase Storage 实现图片/文件上传接口。

- [ ] Task 4: 前后端联调与接口替换
  - [ ] SubTask 4.1: 在前端工程统一封装 HTTP 请求层（axios/fetch 或 wx.request），配置 baseURL、全局 Header 与请求/响应拦截器。
  - [ ] SubTask 4.2: 配置前端路由守卫，实现登录态保持与无感刷新 Token。
  - [ ] SubTask 4.3: 逐步将前端的硬编码和 mock 数据替换为对后端的真实 API 调用（包含列表渲染、分页、搜索等）。
  - [ ] SubTask 4.4: 联调文件上传、富文本/多图展示功能，验证端到端交互。

- [ ] Task 5: 测试、优化与文档交付
  - [ ] SubTask 5.1: 编写 Pytest 单元测试与集成测试，确保核心业务 API 覆盖率 ≥ 85%。
  - [ ] SubTask 5.2: 配置 CI 流程实现自动代码风格检查（Pylint ≥ 8.5）与自动化测试运行。
  - [ ] SubTask 5.3: 优化数据库查询逻辑（确保命中索引）并检查安全隐患，满足 P95 < 500ms 和 OWASP 安全标准。
  - [ ] SubTask 5.4: 编写并生成完整的 API 文档（OpenAPI/Swagger 格式）。
  - [ ] SubTask 5.5: 编写项目 README，涵盖本地开发启动步骤、环境变量、部署指南。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 3] and [Task 4]
