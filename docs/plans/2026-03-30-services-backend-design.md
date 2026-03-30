# 四类宠物服务后端接通设计

## 背景

当前小程序已具备四类宠物服务的前端入口与预约页面：

- 疫苗
- 美容
- 医疗
- 寄养

但现状仍停留在页面内 mock 数据 + 本地跳转成功页阶段。后端虽已有通用预约表 `service_appointments` 与基础 CRUD 接口，但缺少支撑真实业务的服务目录、机构门店、服务项目与可预约时段层。

本次目标是将四类服务的前后端与数据库完整接通，形成可真实查询、选择并创建预约订单的闭环。

## 目标

- 为四类服务建立统一且可扩展的后端业务模型
- 打通前端服务页与后端真实接口
- 将预约数据写入数据库并可按用户查询
- 兼容现有项目的 Flask + SQLAlchemy + 小程序 request service 模式
- 保留现有页面结构，优先完成真实链路接通

## 非目标

- 不做支付、退款与财务对账
- 不做真实地图定位与距离计算
- 不做医生/美容师个人级排班
- 不做疫苗 OCR 导入与记录落库联动
- 不做复杂后台运营管理界面

## 现状问题

### 前端

- 通用服务页 `pages/service/index` 的服务项、门店、时间段均为本地数组
- 疫苗预约页 `pages/vaccine/appointment/index` 也维护独立 mock 数据
- 页面提交预约时未调用后端，只拼接 query 跳转成功页

### 后端

- `ServiceAppointment` 只有 `service_type / appointment_at / pet_id / notes` 等通用字段
- 缺少服务机构、服务项目、时间段模型
- 现有 `/services/appointments` 无法支撑前端真实选项拉取

## 方案对比

### 方案 A：继续沿用现有预约表，追加少量字段

做法：

- 只在 `ServiceAppointment` 上增加 `providerName / itemName / price / timeLabel`
- 前端继续保留页面内服务项和门店配置

优点：

- 改动最小
- 最快看到提交成功

缺点：

- 业务数据仍分散在前端
- 无法真正做到“前后端和数据库接通”
- 后续新增项目、上下架、排班会非常难维护

### 方案 B：建立完整业务层并一次接通

做法：

- 新增服务机构、服务项目、可预约时段等表
- 扩展预约表存储关联关系与预约快照
- 前端全部通过接口拉真实数据

优点：

- 架构完整
- 四类服务具备可持续扩展能力

缺点：

- 一次性改动较大
- 前后端联调工作量高

### 方案 C：完整模型 + 分阶段接通

做法：

- 后端一次建立完整模型
- 第一阶段先接通“拉服务数据 + 创建预约 + 查询预约”
- 现有成功页、记录页保留轻量适配

优点：

- 业务层完整
- 首阶段可以尽快跑通真实链路
- 对现有页面侵入较小

缺点：

- 仍需要对部分页面做过渡兼容

## 推荐方案

采用方案 C：完整模型 + 分阶段接通。

原因：

- 用户当前目标是“四个宠物服务功能的后端，将前后端和数据库接通”，不是只做最小 mock 落库
- 现有项目已有统一请求层、统一响应格式、统一认证与宠物数据基础，适合在此基础上搭建完整业务层
- 分阶段接通可以避免一次性改掉疫苗模块和通用服务模块的全部交互细节

## 数据模型设计

### 1. 服务机构 ServiceProvider

用于承载医院、宠物门店、寄养门店等实体。

核心字段：

- `id`
- `service_type`
- `name`
- `description`
- `distance_text`
- `rating_text`
- `business_hours`
- `address`
- `cover_image`
- `status`
- `sort_order`

### 2. 服务项目 ServiceOffering

用于承载某机构下具体可预约项目。

核心字段：

- `id`
- `provider_id`
- `service_type`
- `name`
- `summary`
- `description_json`
- `price`
- `duration_minutes`
- `status`
- `sort_order`

示例：

- 疫苗：核心疫苗、选择性疫苗
- 美容：基础洗护、全身造型
- 医疗：常规内科、外科手术
- 寄养：标准舱、豪华套房

### 3. 服务时段 ServiceSlot

用于承载某服务项目某天的可预约时段与剩余数量。

核心字段：

- `id`
- `provider_id`
- `offering_id`
- `service_type`
- `service_date`
- `time_label`
- `capacity`
- `reserved_count`
- `status`

### 4. 扩展预约单 ServiceAppointment

保留现有表，扩展为真正订单主表。

新增字段：

- `provider_id`
- `offering_id`
- `slot_id`
- `service_date`
- `time_label`
- `price`
- `snapshot_json`

说明：

- `snapshot_json` 用于存储预约提交时的服务名称、机构名称、价格等快照，避免后续配置变更影响历史订单展示

## 数据流设计

### 前端加载链路

1. 页面加载时获取宠物列表
2. 根据 `serviceType` 拉机构列表
3. 根据选中机构与服务类型拉服务项目
4. 根据选中项目和日期拉可预约时段
5. 用户提交预约，后端校验并创建预约单
6. 成功页使用返回结果展示预约摘要

### 后端创建预约链路

1. 校验登录用户
2. 校验宠物归属
3. 校验机构、项目、时段是否存在且匹配服务类型
4. 校验时段剩余容量
5. 增加 `reserved_count`
6. 创建 `ServiceAppointment`
7. 返回预约结果与展示快照

## 接口设计

### 查询类

- `GET /api/v1/services/providers?serviceType=`
- `GET /api/v1/services/offerings?serviceType=&providerId=`
- `GET /api/v1/services/slots?offeringId=&date=`
- `GET /api/v1/services/appointments`
- `GET /api/v1/services/appointments/<id>`

### 写入类

- `POST /api/v1/services/appointments`
- `POST /api/v1/services/appointments/<id>/cancel`

### 创建预约请求体

- `serviceType`
- `petId`
- `providerId`
- `offeringId`
- `slotId`
- `appointmentAt`
- `notes`

## 前端改造设计

### 通用服务页

`pages/service/index` 改造为：

- 页面不再写死服务项、门店、时段
- 使用新增 `miniprogram/services/services.ts` 拉取真实数据
- `submitOrder` 改为调用创建预约接口

### 疫苗预约页

`pages/vaccine/appointment/index` 改造为：

- 保持独立 UI 布局
- 数据来源改为同一套服务接口
- 提交后走真实预约单创建逻辑

### 成功页

- 继续复用现有 success 页面
- 参数来源从“本地拼接”改为“后端返回的预约结果”

## 数据初始化

为了让四类服务开箱可用，后端需要提供一组默认种子数据：

- 每类服务至少 2 个机构
- 每个机构至少 2 个服务项目
- 每个项目对未来 3 天生成若干默认时段

初始化方式：

- 使用启动期自愈脚本确保老库补齐表结构
- 在无服务基础数据时自动写入默认种子

## 测试设计

### 后端测试

- 查询四类服务机构列表
- 查询机构下服务项目
- 查询某项目可预约时段
- 使用本人宠物成功创建预约
- 非本人宠物创建失败
- 时段约满后创建失败
- 取消预约成功

### 前端测试

- service services 封装函数返回结构正确
- 疫苗预约页与通用服务页能消费同一后端结构

## 风险与处理

### 风险 1：旧数据库没有新表或新列

处理：

- 使用与现有 `schema_ensure.py` 一致的自愈模式补齐

### 风险 2：前端疫苗页与通用服务页结构不同

处理：

- 统一接口结构，不强行统一页面布局

### 风险 3：历史预约数据缺少快照

处理：

- 旧数据接口返回时做兜底
- 新数据创建时完整写入 `snapshot_json`

## 第一阶段实施范围

- 新增服务机构、服务项目、服务时段三张表
- 扩展预约单模型
- 完成默认种子数据初始化
- 接通通用服务页和疫苗预约页
- 完成创建预约、查询预约、取消预约
- 补齐后端测试与前端 service 测试

## 相关文件

- `backend/app/models.py`
- `backend/app/schema_ensure.py`
- `backend/app/__init__.py`
- `backend/app/api/v1/services.py`
- `backend/tests/test_services_appointments.py`
- `PawHome/miniprogram/services/request.ts`
- `PawHome/miniprogram/services/user.ts`
- `PawHome/miniprogram/pages/service/index.ts`
- `PawHome/miniprogram/pages/vaccine/appointment/index.ts`
