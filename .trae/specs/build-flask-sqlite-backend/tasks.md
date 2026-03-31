# Tasks

- [x] Task 1: 完成前端能力盘点与接口映射
  - [x] SubTask 1.1: 梳理前端页面路由、状态模型、交互事件与数据流入口。
  - [x] SubTask 1.2: 建立页面到资源域模型的映射矩阵（用户、宠物、社区、服务、商城、订单、消息）。
  - [x] SubTask 1.3: 明确每个能力点所需的 API、鉴权级别、请求参数与响应契约。

- [x] Task 2: 搭建 Flask 后端工程基础骨架
  - [x] SubTask 2.1: 建立应用分层结构（路由层、服务层、仓储层、模型层、配置层）。
  - [x] SubTask 2.2: 接入环境配置、统一响应封装、异常处理中间件与日志策略。
  - [x] SubTask 2.3: 建立版本化 API 前缀与健康检查接口。

- [x] Task 3: 设计并落地 SQLite Schema
  - [x] SubTask 3.1: 基于域模型定义核心表、字段类型、索引与唯一约束。
  - [x] SubTask 3.2: 定义外键关系、软删除策略、审计字段（创建/更新时间）与状态字段。
  - [x] SubTask 3.3: 编写初始化与迁移脚本，支持可重复执行。

- [x] Task 4: 实现用户认证与权限控制
  - [x] SubTask 4.1: 实现注册、登录、令牌签发与令牌校验机制。
  - [x] SubTask 4.2: 建立受保护路由鉴权装饰器与权限错误响应。
  - [x] SubTask 4.3: 增加用户资料读取与更新接口。

- [ ] Task 5: 实现核心业务域 RESTful API
  - [ ] SubTask 5.1: 实现宠物档案、社区内容、服务预约的 CRUD 与分页查询接口。
  - [ ] SubTask 5.2: 实现商城商品、购物车、订单、支付状态流转接口。
  - [ ] SubTask 5.3: 实现消息通知、个人中心统计与关联聚合接口。

- [ ] Task 6: 增加服务端校验与错误治理
  - [ ] SubTask 6.1: 为关键接口增加参数校验与业务规则校验。
  - [ ] SubTask 6.2: 统一错误码、错误消息与异常映射策略。
  - [ ] SubTask 6.3: 为并发敏感操作增加幂等或事务保护。

- [ ] Task 7: 将前端服务层从 Mock 切换到真实 API
  - [ ] SubTask 7.1: 重构 `miniprogram/services` 中各模块请求实现，改为调用后端接口。
  - [ ] SubTask 7.2: 替换页面中的 Mock 依赖，统一使用服务层数据访问。
  - [ ] SubTask 7.3: 保留可配置 Mock 兜底开关，确保开发阶段可平滑切换。

- [ ] Task 8: 完成联调与回归测试
  - [ ] SubTask 8.1: 编写并执行后端接口测试（认证、CRUD、状态流转、异常分支）。
  - [ ] SubTask 8.2: 执行前后端联调测试，覆盖登录、发布、预约、下单、订单查询等主流程。
  - [ ] SubTask 8.3: 修复联调问题并输出验证结果。

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1], [Task 2]
- [Task 4] depends on [Task 2], [Task 3]
- [Task 5] depends on [Task 3], [Task 4]
- [Task 6] depends on [Task 4], [Task 5]
- [Task 7] depends on [Task 4], [Task 5], [Task 6]
- [Task 8] depends on [Task 7]
