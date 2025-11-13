# 爱宠家宠物社区微信小程序（用户端）

一个基于微信小程序的宠物社区应用，集社区交流、商品购买、宠物服务与个人中心于一体，提供流畅的内容浏览、互动与服务预约体验。

## 功能模块
- 社区交流：发帖/浏览、点赞、评论、收藏、话题、私信
- 商品购买：分类浏览、搜索、购物车、下单、退款、评价
- 宠物服务：疫苗/美容/医疗/寄养机构与项目，排班与预约、记录与评价
- 个人中心：资料与安全设置、宠物信息卡、收藏与历史、订单与预约

## 技术栈
- 前端：微信小程序原生框架 + TypeScript + Vant Weapp/WeUI（可选）
- 后端：Flask 微服务（设计文档与接口规范已产出）
- 数据库：MySQL + Redis

## 项目结构
```
PawHome/
└─ miniprogram/
   ├─ assets/
   │  ├─ images/home/   # 主页图片与图标
   │  ├─ icons/tab/     # TabBar 图标（选中/未选中）
   │  └─ fonts/         # 字体文件（示例：ZhanKuKuaiLeTi2016XiuDingBan-1.ttf）
   ├─ pages/
   │  ├─ home/          # 主页面（轮播、广告位、服务入口）
   │  ├─ community/     # 社区
   │  ├─ shop/          # 商城
   │  ├─ service/       # 服务
   │  ├─ my/            # 我的
   │  ├─ login/         # 登录页（验证码登录/微信登录/调试跳过）
   │  └─ index/         # 小程序默认示例页，含“进入主页面”入口
   ├─ services/         # 接口封装（统一 request、auth）
   ├─ config/           # 环境配置（BASE_URL）
   ├─ utils/            # 工具（校验等）
   ├─ app.json          # 路由与 TabBar 配置
   ├─ app.ts            # 小程序启动逻辑（自动登录）
   └─ app.wxss          # 全局样式与字体声明
```

## 快速开始
- 导入项目：使用微信开发者工具导入 `PawHome/miniprogram` 目录
- 设置 `appid`：在 `project.config.json` 中替换为你的小程序 `appid`
- 域名校验：开发阶段 `project.config.json` 已关闭 `urlCheck`
- 运行预览：编译并预览，登录页支持验证码登录、微信登录与调试跳过

## 环境配置
- 接口地址：修改 `miniprogram/config/env.ts` 中的 `BASE_URL`
- 字体：`miniprogram/app.wxss` 已声明 `@font-face` 并在主页标题应用，如在真机上不生效，建议转换为 `woff2` 并使用 `wx.loadFontFace` 远程加载（需配置下载文件合法域名）

## 主页说明
- 轮播区：上下滚动、卡片圆角与右下阴影、左侧三条指示同步高亮
- 广告位：右侧卡片，背景 `#FFF9C6`，右下阴影 `#849C4E`
- 搜索条：猫形图片覆盖，输入框叠加在图片空白区域
- TabBar：系统级 TabBar，图标来自 `miniprogram/assets/icons/tab/`

## 接口文档与数据库
- 接口文档（OpenAPI 3.0）：`输出文档/接口文档.yaml`
- 数据库表设计：`输出文档/数据库表设计.sql`
- ER 与 UML 图：`输出文档/ER-图.puml`、用例/类图与流程图 `.puml`

## 提交与推送
```
# 初始化并推送到你的仓库
cd PawHome
git init
git add .
git commit -m "init: PawHome miniapp"
git branch -M main
git remote add origin https://github.com/<yourname>/PAWHome.git
git push -u origin main
```

## 许可证
- 本项目代码仅用于学习与演示，实际商用请依据你的组织规范与法律合规条款。
