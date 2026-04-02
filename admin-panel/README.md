# 爱宠家 (PawHome) 后台管理系统运行指南

## 1. 简介
本项目是爱宠家小程序的网页端后台管理系统。
- **前端架构**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + ECharts
- **后端架构**：Flask + SQLAlchemy

## 2. 本地开发运行说明

### 2.1 启动后端服务（本项目内置 Node API，推荐）
本仓库在 `admin-panel/server` 内提供了一个轻量的本地 API（Express + SQLite），用于本地联调与演示。

1. 打开一个新终端，进入 `admin-panel` 目录：
   ```bash
   cd admin-panel
   ```
2. 安装依赖（如果是首次运行）：
   ```bash
   npm install
   ```
3. 启动 API 服务：
   ```bash
   npm run dev:api
   ```
   *服务将默认运行在 `http://127.0.0.1:5101/`*

### 2.2 启动前端服务 (Vite + Vue 3)

1. 打开另一个新终端，进入 `admin-panel` 目录：
   ```bash
   cd admin-panel
   ```
2. 安装 NPM 依赖（如果是首次运行）：
   ```bash
   npm install
   ```
3. 启动 Vite 开发服务器：
   ```bash
   npm run dev:web
   ```
   *服务将默认运行在 `http://localhost:5173/`*

也可以一键双开（API + 前端）：
```bash
npm run dev:all
```

### 2.3 登录系统
- 在浏览器中打开：`http://localhost:5173/`
- 使用默认的超级管理员账号进行登录：
  - **用户名**：`admin`
  - **密码**：`admin123`

---

## 3. 生产环境部署建议

### 前端部署
在 `admin-panel` 目录下执行打包命令：
```bash
npm run build
```
执行完毕后，会在目录下生成一个 `dist` 文件夹。将该文件夹下的所有静态文件部署到 Nginx 或其他静态资源服务器中即可。

### 后端部署
当前 `admin-panel/server` 仅面向本地演示与联调；如需生产部署，请对接你的正式后端（例如现有 Flask 服务）。
