***

name: miniprogram-page-guard
description: WeChat 小程序页面新增/注册护栏。用于新增页面、修改 app.json pages、或修复开发者工具报错 “could not find the corresponding file: ... index.wxml/index.js”。执行标准化建页流程：创建目录与必需文件（wxml/wxss/json + ts 或 js）、注册到 miniprogram/app.json、校验 JSON 合法与文件存在、必要时生成 index.js 兼容入口以避免 TS 编译/缓存导致的缺失报错。
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 目标

在 PawHome 小程序中新增页面时，保证：

- `app.json` 的 `pages[]` 路由存在且 JSON 合法
- 页面目录下文件齐全：`index.wxml` / `index.wxss` / `index.json` / `index.ts`（推荐）或 `index.js`
- 避免开发者工具缓存/编译插件异常导致的 “找不到 index.wxml / index.js” 报错

## 适用工程约定（PawHome）

- 小程序根目录：`PawHome/miniprogram/`
- 页面路由：`pages/**/index`
- 页面默认文件名：`index.wxml`、`index.wxss`、`index.json`、`index.ts`

## 标准建页流程（必须逐步执行）

### 1) 确定页面路由

- 使用全路径路由字符串（不带后缀），例如：`pages/my/settings/pets/detail/index`
- 先检查 `miniprogram/app.json` 是否已存在相同路由，避免重复

### 2) 创建页面目录与 4 个基础文件

在 `miniprogram/<route_dir>/` 创建：

- `index.wxml`
- `index.wxss`
- `index.json`（至少设置 `navigationBarTitleText`）
- `index.ts`（使用 `Page({ ... })`）

### 3) 强一致性规则（避免 devtools 找不到文件）

当出现以下任一条件时，额外生成 `index.js` 作为兼容入口（与 `index.ts` 同目录）：

- 新增页面后 devtools 报 `could not find ... index.js`
- 工程启用了 TypeScript 插件但 devtools 仍报缺失（常见于缓存或编译失败）

`index.js` 要求：

- 必须能直接运行：包含 `Page({ ... })`
- 如果页面逻辑很薄，允许在 `index.js` 里直接实现（以保证 devtools 稳定）
- `index.ts` 可保留作为后续迁移/类型提示，但以可运行 `index.js` 为兜底

### 4) 注册路由到 app.json（只改 pages 数组）

- 将新路由插入到 `miniprogram/app.json` 的 `pages[]`（保持与同模块页面相邻）
- 禁止产生非法 JSON（尤其避免把逗号单独放到下一行）

### 5) 绑定入口跳转（如需求要求）

- 列表项点击：`bindtap` → `wx.navigateTo({ url: '/<route>?id=xxx' })`
- 卡片点击：同上

### 6) 自检清单（交付前必须完成）

- `miniprogram/app.json` 可被严格 JSON 解析
- `miniprogram/<route_dir>/index.wxml` 存在
- `miniprogram/<route_dir>/index.wxss` 存在
- `miniprogram/<route_dir>/index.json` 存在
- `miniprogram/<route_dir>/index.ts` 或 `index.js` 至少存在一个可运行入口
- 若 devtools 报缺失：优先补齐 `index.js` 兜底入口（再重启/重新编译）

## 报错修复模式（当已报错时）

当 devtools 提示：

- `could not find ... index.wxml`：先检查物理文件是否存在；若存在，检查 `app.json` 是否 JSON 合法、是否路由写错；再检查同目录是否有编译失败导致的级联错误（如某个 page ts 语法错误）。
- `could not find ... index.js`：在该页面目录补齐 `index.js` 可运行入口（最稳），并确保 `pages[]` 路由正确；然后重新编译或重启 devtools。

