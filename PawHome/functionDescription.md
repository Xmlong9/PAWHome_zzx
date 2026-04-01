## 底部导航 AI宠入口

**目的**
- 在小程序底部导航正中间新增 AI宠 入口，给后续 AI 能力预留稳定入口。
- 让导航结构从 4 项扩展为 5 项，同时保持现有原生 tabBar 的实现方式不变。

**入口**
- 底部导航配置入口位于 `miniprogram/app.json` 的 `tabBar.list`。
- AI宠 页面路由为 `pages/ai/index`，点击底部中间图标后进入。

**数据流/状态**
- 原生 tabBar 直接读取本地图标资源 `assets/icons/tab/ai-pet_notselect@1x.png` 和 `assets/icons/tab/ai-pet@1x.png`。
- AI宠 页面通过 `Page({ data })` 提供展示卡片数据，点击“开始体验”按钮后触发 toast 提示。

**关键分支**
- 继续沿用原生 tabBar，而不是切换为自定义 tabBar，因此只需要新增页面注册和 tabBar 配置。
- 图标来源使用用户提供的 SVG，并生成选中与未选中两套 PNG 资源供 tabBar 使用。

**边界条件**
- `app.json` 必须保持合法 JSON，且 `pages` 与 `tabBar.list` 同时注册 `pages/ai/index`。
- 原生 tabBar 依赖本地图片资源，不能直接使用 SVG 字符串，因此需要落地为 PNG 图标。
- 新页面需补齐 `index.wxml`、`index.wxss`、`index.json`、`index.ts`，避免页面注册后缺少文件。

**相关文件**
- `miniprogram/app.json`
- `miniprogram/pages/ai/index.json`
- `miniprogram/pages/ai/index.ts`
- `miniprogram/pages/ai/index.wxml`
- `miniprogram/pages/ai/index.wxss`
- `miniprogram/assets/icons/tab/ai-pet.svg`
- `miniprogram/assets/icons/tab/ai-pet_notselect@1x.png`
- `miniprogram/assets/icons/tab/ai-pet@1x.png`
- `miniprogram/utils/aiTabBar.test.ts`

### 变更 2026-04-01 AI宠图标强化

- 保持原生 tabBar 方案不变，仅通过重绘 AI宠 的 PNG 图标资源增强中间入口存在感。
- 选中态图标增大主体占比，并加入偏暖色轻微流动感光晕，让中间入口比其他 tab 更醒目。
- 未选中态图标同步增加柔和底盘与浅色光晕，避免切换前后视觉落差过大。
- 回归测试补充为对比 AI宠 与普通 tab 图标资源体量，确保强化视觉层不会被误回退。

### 变更 2026-04-01 AI.png 中心主入口

- 将 AI宠 图标核心素材切换为 `backend/instance/uploads/AI.png`，以盒子猫图片替代原先的像素风图标。
- 选中态与未选中态都改为圆形主按钮构图，通过底盘、内高光、投影和裁切后的图片主体，强化中间主入口感。
- 选中态额外提升按钮尺寸和暖色辉光强度，使 AI宠 在原生 tabBar 中尽量接近“中心按钮”的视觉效果。
- 测试阈值同步提高，要求 AI宠 图标资源显著大于普通 tab 图标，避免后续回退成普通小图标。

### 变更 2026-04-01 去除底盘并直接放大

- 根据反馈移除 AI宠 图标的底盘/光晕等背景元素，避免出现额外装饰影响观感。
- 不对源图片进行手动裁切，直接将 `AI.png` 以更大的缩放比例铺满图标画布，增强“更大”的主入口视觉权重。
- 为保证回归稳定，测试新增对 PNG 解码与角落不透明度检查，确保不再出现底盘光晕与透明边缘。

### 变更 2026-04-01 原图裁切后提升至 37x37

- 使用用户最新裁切后的 `backend/instance/uploads/AI.png` 重新生成 tabBar 图标资源，进一步减少留白带来的“小图标”观感。
- 将 AI宠 的 tabBar 图标资源提升为 37x37（与项目中最大 tab 图标尺寸对齐），增强中间入口的视觉权重。
