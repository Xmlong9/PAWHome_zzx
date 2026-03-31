# 爱宠家 - 宠物社区应用

## 项目介绍

爱宠家是一个基于微信小程序的宠物社区应用，集社区交流、商品购买、宠物服务与个人中心于一体，提供流畅的内容浏览、互动与服务预约体验。

### 主要功能

- **社区交流**：发布帖子、评论互动、点赞收藏
- **商品购物**：浏览商品、购物车管理、下单支付
- **宠物服务**：服务预约、疫苗记录管理
- **个人中心**：用户信息管理、宠物档案、订单管理
- **管理后台**：用户管理、内容管理、商城管理、服务管理

## 技术架构

### 前端
- **微信小程序**：原生框架 + TypeScript
- **管理端**：React 18 + TypeScript + Ant Design Pro

### 后端
- **框架**：Flask 微服务
- **ORM**：SQLAlchemy
- **数据库**：SQLite/MySQL
- **认证**：JWT
- **API文档**：Swagger/OpenAPI

## 项目结构

```
├── PawHome/                # 小程序前端目录
│   ├── miniprogram/        # 小程序核心代码
│   │   ├── assets/         # 静态资源
│   │   ├── pages/          # 页面目录
│   │   ├── services/       # API服务封装
│   │   ├── config/         # 环境配置
│   │   ├── utils/          # 工具函数
│   │   ├── app.json        # 小程序配置
│   │   ├── app.ts          # 小程序入口
│   │   └── app.wxss        # 全局样式
│   └── typings/            # TypeScript类型定义
├── backend/                # 后端服务目录
│   ├── app/                # 应用核心
│   │   ├── api/            # API路由
│   │   ├── models.py       # 数据模型
│   │   └── config.py       # 配置文件
│   ├── instance/           # 实例数据
│   ├── scripts/            # 脚本工具
│   └── tests/              # 测试用例
├── admin/                  # 管理端目录
│   ├── src/                # 前端源码
│   ├── public/             # 静态资源
│   └── package.json        # 依赖配置
├── ADMIN_PANEL_DESIGN.md   # 管理端设计文档
├── CODE_WIKI.md            # 项目代码维基
└── README.md               # 项目说明文档
```

## 快速开始

### 前端开发

1. **安装依赖**
   ```bash
   cd PawHome/miniprogram
   npm install
   ```

2. **配置环境**
   - 修改 `miniprogram/config/env.ts` 中的 `BASE_URL` 为后端服务地址

3. **运行项目**
   - 使用微信开发者工具导入 `PawHome/miniprogram` 目录
   - 编译并预览

### 后端开发

1. **安装依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **初始化数据库**
   ```bash
   python scripts/init_db.py
   ```

3. **启动服务**
   ```bash
   python run.py
   ```

4. **测试API**
   ```bash
   python scripts/smoke_api.py
   ```

### 管理端开发

1. **安装依赖**
   ```bash
   cd admin
   npm install
   ```

2. **运行项目**
   ```bash
   npm start
   ```

## 核心功能模块

### 小程序端

- **主页**：轮播图、广告位、热门帖子、服务入口
- **社区**：帖子浏览、发布、评论互动
- **商城**：商品浏览、购物车、订单管理
- **服务**：宠物服务预约、疫苗记录管理
- **个人中心**：用户信息、宠物档案、订单管理

### 管理端

- **仪表盘**：数据概览、趋势分析、系统状态
- **用户管理**：用户列表、详情、操作
- **内容管理**：帖子审核、评论管理、内容统计
- **商城管理**：商品管理、订单处理、库存监控
- **服务管理**：服务提供商管理、预约管理
- **系统设置**：系统配置、权限管理、日志管理

## API文档

后端API文档使用Swagger/OpenAPI规范，可通过以下地址访问：
- 开发环境：`http://localhost:5000/api/docs`
- 生产环境：`https://your-domain.com/api/docs`

## 部署与发布

### 前端发布
1. 在微信开发者工具中构建小程序
2. 提交代码审核
3. 审核通过后发布

### 后端部署
1. 配置生产环境数据库
2. 设置环境变量 `FLASK_ENV=production`
3. 使用 WSGI 服务器（如 Gunicorn）运行应用
4. 配置 Nginx 作为反向代理

### 管理端部署
1. 构建前端应用：`npm run build`
2. 将构建产物部署到Web服务器
3. 配置Nginx反向代理到后端API

## 开发规范

### 前端规范
- 使用 TypeScript 编写代码
- 页面文件使用 `.ts`、`.wxml`、`.wxss`、`.json` 结构
- 组件化开发，复用公共组件
- 遵循微信小程序开发最佳实践

### 后端规范
- 使用 Flask 蓝图组织 API 路由
- 采用 RESTful API 设计风格
- 使用 SQLAlchemy ORM 操作数据库
- 编写单元测试和集成测试

## 监控与维护

### 前端监控
- 使用微信开发者工具的调试功能
- 监控用户行为和错误日志

### 后端监控
- 日志记录系统运行状态
- 监控 API 响应时间和错误率
- 定期备份数据库

## 技术文档

- [管理端设计文档](file:///workspace/ADMIN_PANEL_DESIGN.md)
- [项目代码维基](file:///workspace/CODE_WIKI.md)

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目主页：[https://github.com/yourusername/pawhome](https://github.com/yourusername/pawhome)
- 问题反馈：[https://github.com/yourusername/pawhome/issues](https://github.com/yourusername/pawhome/issues)

---

**爱宠家** - 让宠物生活更美好！ 🐾