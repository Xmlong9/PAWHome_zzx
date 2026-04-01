# 爱宠家 (PawHome) 后台管理系统运行指南

## 1. 简介
本项目是爱宠家小程序的网页端后台管理系统。
- **前端架构**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + ECharts
- **后端架构**：Flask + SQLAlchemy

## 2. 本地开发运行说明

### 2.1 启动后端服务 (Flask)
后端服务负责提供所有的 API 数据接口。

1. 打开一个新终端，进入 `backend` 目录：
   ```bash
   cd backend
   ```
2. 激活虚拟环境并安装依赖（如果尚未安装）：
   ```bash
   # 如果有虚拟环境，请先激活，例如: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. 运行 Flask 服务：
   ```bash
   python run.py
   ```
   *服务将默认运行在 `http://127.0.0.1:5001/`*

### 2.2 启动前端服务 (Vite + Vue 3)
前端项目位于 `admin-panel` 目录。

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
   npm run dev
   ```
   *服务将默认运行在 `http://localhost:5173/`*

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
建议使用 Gunicorn 或 uWSGI 作为 WSGI 服务器运行 Flask 应用，并配置 Nginx 作为反向代理服务器。
