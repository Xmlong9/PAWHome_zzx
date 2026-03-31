  1→# 功能说明文档（functionDescription.md）
  2→
  3→本文件用于沉淀本项目已实现功能的“实现逻辑说明”。每当讨论某个功能的实现细节或新增/调整功能时，将对应说明追加到本文件，便于后续快速回溯。
  4→
  5→## 书写规范
  6→
  7→- 每个功能使用一个二级标题（`##`）。
  8→- 说明尽量包含：入口、数据流/状态、关键分支、边界条件、相关文件。
  9→- 只写“是什么/怎么做/为什么这样做”，避免贴大段代码。
 10→
 11→---
 12→
 13→## 帖子浏览数（viewCount）统计逻辑
 14→
 15→**目的**
 16→- 展示帖子被浏览的去重统计值（更接近 UV，而非 PV）。
 17→
 18→**统计口径**
 19→- `viewCount` 由后端根据 `PostHistory` 表对同一 `post_id` 的记录数计算得出。
 20→- `(user_id, post_id)` 复合主键保证同一用户对同一帖子最多贡献 1 次浏览计数。
 21→
 22→**增长时机**
 23→- 访问帖子详情接口 `GET /posts/<post_id>`：
 24→  - 若该用户首次浏览该帖：插入 `PostHistory(user_id, post_id)`，从而使 `viewCount +1`。
 25→  - 若已浏览过：仅更新 `last_viewed_at`，不增加计数。
 26→
 27→**哪些接口会返回 viewCount**
 28→- 社区列表 `GET /posts` 默认不返回 `viewCount`（列表通常拿不到该字段）。
 29→- 我的帖子 `GET /users/me/posts` 返回 `viewCount`。
 30→- 帖子详情 `GET /posts/<post_id>`：仅作者本人查看自己帖子时返回 `viewCount`。
 31→
 32→**前端展示方式**
 33→- 前端不自增 `viewCount`，仅在字段存在时展示（`wx:if="{{...viewCount !== undefined}}"`）。
 34→- 相关页面：
 35→  - 社区列表页：时间行右侧展示浏览数（EyeOutlined 图标）。
 36→  - 帖子详情页：时间行右侧展示浏览数（EyeOutlined 图标）。
 37→  - 个人主页帖子卡片：展示浏览数（EyeOutlined 图标）。
 38→
 39→**相关文件**
 40→- 后端：
 41→  - `backend/app/api/v1/posts.py`
 42→  - `backend/app/models.py`
 43→- 小程序：
 44→  - `PawHome/miniprogram/services/posts.ts`
 45→  - `PawHome/miniprogram/pages/post-detail/index.ts`
 46→  - `PawHome/miniprogram/pages/post-detail/index.wxml`
 47→  - `PawHome/miniprogram/pages/community/index.wxml`
 48→  - `PawHome/miniprogram/pages/user-profile/index.wxml`
 49→
 50→---
 51→
 52→## 分享弹窗（底部 Sheet）丝滑动画
 53→
 54→**目的**
 55→- 让分享弹窗弹出/收起更顺滑，避免因节点首次渲染直接处于最终态而“没有过渡动画”。
 56→
 57→**入口**
 58→- 帖子详情页右上角“…”按钮触发打开。
 59→- 点击遮罩或取消触发关闭。
 60→
 61→**数据流/状态**
 62→- `showActionPanel`：控制节点是否挂载（`wx:if`）。
 63→- `actionPanelVisible`：控制是否添加 `.show` 类，从而触发 CSS 过渡。
 64→
 65→**关键分支**
 66→- 打开：先 `showActionPanel=true` 挂载面板，再短延时设置 `actionPanelVisible=true` 触发过渡。
 67→- 关闭：先 `actionPanelVisible=false` 播放收起动画，再延时将 `showActionPanel=false` 卸载节点。
 68→
 69→**边界条件**
 70→- 连续快速打开/关闭：通过定时器清理避免状态抖动。
 71→
 72→**相关文件**
 73→- `PawHome/miniprogram/pages/post-detail/index.ts`
 74→- `PawHome/miniprogram/pages/post-detail/index.wxml`
 75→- `PawHome/miniprogram/pages/post-detail/index.wxss`
 76→
 77→---
 78→
 79→## 商城-余额充值与余额支付（演示版）
 80→
 81→**目的**
 82→- 提供可演示的“余额充值→余额入库→下单后用余额支付→余额扣减”闭环。
 83→
 84→**入口**
 85→- 充值页：`/pages/shop/recharge`
 86→- 结算页：`/pages/shop/order/checkout`
 87→- 订单支付：订单列表/订单详情的“去支付”
 88→
 89→**数据流/状态**
 90→- Mock 模式（演示）：
 91→  - 钱包余额：`wx.setStorageSync("wallet_balance")`
 92→  - 钱包流水：`wx.setStorageSync("shop_wallet_txs")`（JSON 数组）
 93→  - 订单：`wx.setStorageSync("shop_orders")`（JSON 数组）
 94→- 非 Mock 模式：
 95→  - 充值：`POST /shop/recharge`
 96→  - 下单：`POST /shop/order`（包含 `payType`）
 97→  - 支付：`POST /shop/orders/:id/pay`
 98→
 99→**关键分支**
100→- 结算页新增 `payType=balance`：
101→  - 当 `walletBalance < payableAmount` 时提示“余额不足”并引导去充值。
102→- 余额支付在结算页点击“提交订单”后会自动完成支付（演示用），成功后直接跳转订单列表并展示“已支付”提示。
103→- 支付时扣减余额（Mock）：
104→  - 若订单 `payType=balance` 且余额充足：扣减 `wallet_balance`、写入一条 `shop_wallet_txs`、订单状态变更为 `shipping`。
105→  - 若余额不足：支付失败并引导去充值。
106→
107→**边界条件**
108→- 订单非 `pending_pay` 状态不重复扣款。
109→- 余额使用小数并统一保留两位。
110→
111→**相关文件**
112→- `PawHome/miniprogram/pages/shop/recharge.ts`
113→- `PawHome/miniprogram/pages/shop/order/checkout.ts`
114→- `PawHome/miniprogram/pages/shop/order/checkout.wxml`
115→- `PawHome/miniprogram/pages/shop/order/list.ts`
116→- `PawHome/miniprogram/pages/shop/order/detail/index.ts`
117→- `PawHome/miniprogram/services/shop.ts`
118→
119→### 变更 2026-03-29：充值档位加载失败兜底
120→
121→**问题现象**
122→- 充值页未展示档位列表，点击“立即充值”无响应（实际是档位请求失败导致 `selectedId` 为空）。
123→
124→**修复方案**
125→- 充值页拉取档位增加 `try/catch`，失败时使用内置固定档位兜底。
126→- 点击充值时若未选择档位，toast 提示“请选择充值金额”。
127→
128→### 变更 2026-03-29：后端充值接口 404 自动降级
129→
130→**问题现象**
131→- 在非 Mock 环境下调用 `POST /shop/recharge` 返回 404，导致演示充值失败。
132→
133→**修复方案**
134→- `services/shop.ts` 中 `listRechargeOptions/submitRecharge` 在接口 404/NOT_FOUND 时自动降级到本地 Mock 逻辑：余额写入 `wallet_balance`，并写入一条 `shop_wallet_txs` 记录。
135→
136→### 变更 2026-03-29：后端自动补齐充值档位（app.db）
137→
138→**目的**
139→- 让充值与余额入库不依赖手动跑 seed 脚本：即使 `recharge_options` 为空也能正常充值。
140→
141→**实现要点**
142→- 后端在 `GET /shop/recharge/options` 与 `POST /shop/recharge` 内部调用 `_ensure_recharge_options_seeded()`：当表为空时自动插入 `r1~r4`。
143→- 当请求带 `optionId=r1~r4` 但数据库查不到对应记录时，后端使用内置兜底金额继续入账并写入 `wallets.balance_cents`。
144→
145→### 变更 2026-03-29：统一充值档位金额（前后端一致）
146→
147→**问题现象**
148→- 小程序展示的档位为 `30/68(+8)/128(+20)/328(+68)`，但后端 `recharge_options` 可能为另一套金额，导致 `optionId` 对应不上、入账金额不一致。
149→
150→**修复方案**
151→- 后端 `recharge_options` 固定为：
152→  - `r1=30`、`r2=68+8`、`r3=128+20`、`r4=328+68`（单位分存储到 `amount_cents/bonus_cents`）。
153→- 种子脚本与运行时补齐逻辑均采用同一套配置，避免环境差异。
154→
155→---
156→
157→## 商城-客服中心（智能客服/人工客服/历史会话）
158→
159→**目的**
160→- 在商店内提供客服能力：
161→  - 智能客服：基于 FAQ 自动回复（秒回，演示效果）
162→  - 人工客服：进入对话界面，消息入库，后续可在管理端接入回复
163→  - 历史会话：展示并可继续进入历史对话
164→
165→**入口**
166→- 客服中心页：`/pages/shop/customer-service`
167→- 客服聊天页：`/pages/shop/customer-service-chat/index`
168→
169→**数据流/状态**
170→- FAQ：
171→  - 小程序通过 `GET /api/v1/shop/customer-service/faqs` 拉取常见问题列表。
172→- 会话/消息入库（SQLite：`backend/instance/app.db`）：
173→  - `support_conversations`：按用户维护客服会话（`mode=smart|human`）
174→  - `support_messages`：会话消息（`sender_role=user|bot|agent`）
175→
176→**关键分支**
177→- 智能客服（`mode=smart`）：
178→  - 用户发送消息后，后端根据 FAQ 精确/模糊匹配生成一条 `bot` 回复并入库。
179→- 人工客服（`mode=human`）：
180→  - 仅入库用户消息；人工回复由后续“管理端”实现。
181→
182→**管理端回复（预留）**
183→- 人工客服的“回复”不在小程序端生成：
184→  - 管理端选择某个 `support_conversations.id` 会话
185→  - 写入一条 `support_messages` 记录：
186→    - `conversation_id = <会话ID>`
187→    - `sender_role = "agent"`
188→    - `content = <客服回复文本>`
189→- 小程序端进入该会话时通过 `GET /shop/support/conversations/<cid>/messages` 拉取消息，即可看到 `agent` 回复。
190→
191→### 变更 2026-03-30：智能客服接入豆包 AI（Ark OpenAI SDK）
192→
193→**目的**
194→- 智能客服由豆包 AI 兜底生成回复，实现“AI 全面接管”，同时保证已配置 FAQ 的问答严格一致。
195→- 将回答范围限制在“订单/商店”场景，避免越界回答。
196→
197→**入口**
198→- 发送消息：`POST /api/v1/shop/support/conversations/<cid>/messages`
199→- 拉取消息：`GET /api/v1/shop/support/conversations/<cid>/messages`
200→
201→**数据流/状态**
202→- 后端在 `mode=smart` 下处理用户消息：
203→  1) 将用户消息写入 `support_messages(sender_role=user)`。
204→  2) FAQ 强一致：对用户输入与 FAQ 题干做规范化后“全等匹配”，命中则直接写入 `support_messages(sender_role=bot)`，内容为 FAQ 设定答案原文。
205→  3) 越界拦截：若不属于订单/商店范围，直接返回固定拒答文案（不调用 AI）。
206→  4) 限流：按 `user_id`（20/min）与 `conversation_id`（10/min）做内存滑窗限流，触发则返回“提问太频繁”。
207→  5) 豆包兜底：未命中 FAQ 且未越界且未触发限流时，调用 Ark OpenAI SDK（`chat.completions`），将回复写入 `support_messages(sender_role=bot)`。
208→
209→**边界条件**
210→- 环境变量：
211→  - `ARK_API_KEY`：方舟 API Key（缺失则不调用 AI，走兜底文案）。
212→  - `ARK_MODEL_ID`：推理接入点 ID（缺失则使用默认值）。
213→- AI 调用失败（网络/鉴权/异常）不会影响用户消息入库；bot 回复使用兜底文案。
214→- 限流为单机内存实现，多进程/多实例需替换为 Redis/网关限流以保持一致性。
215→
216→**相关文件**
217→- 后端：
218→  - `backend/app/api/v1/shop.py`
219→  - `backend/requirements.txt`
220→  - `backend/tests/test_support_ai.py`
221→
222→### 变更 2026-03-30：支持订单号触发智能回复
223→
224→**目的**
225→- 用户直接发送订单号（如 `SO1774613445`）时，不应被误判为越界；需要进入智能客服回复流程。
226→
227→**实现要点**
228→- 范围判断增加订单号模式识别（如 `SO` + 数字、长数字、字母+数字组合），命中即视为订单相关。
229→- 同时允许部分“客服/智能/AI 相关”的使用说明问题进入智能回复，避免反复拒答影响体验。
230→
231→### 变更 2026-03-30：问候语也进入智能回复
232→
233→**目的**
234→- 用户输入“你好/您好/在吗”等问候语时，允许进入智能回复（由 AI 做自我介绍与引导），但仍受“只回答订单/商店相关”边界约束。
235→
236→**实现要点**
237→- 将常见问候语加入范围判断白名单，使其不触发越界拒答。
238→
239→### 变更 2026-03-30：优化问候语的 AI 回复风格
240→
241→**目的**
242→- 当用户发送问候语或询问“你是谁/怎么用/能做什么”时，AI 先友好自我介绍并引导到订单/商店问题，而不是直接输出越界拒答提示。
243→
244→**实现要点**
245→- 更新 system prompt：将“问候语与使用说明”作为允许回答的特例，其余无关问题仍需拒答并提示范围。
246→
247→### 变更 2026-03-30：智能客服自动查询订单并注入真实上下文
248→
249→**目的**
250→- 当用户提供订单号（或通过订单卡片发送订单）时，智能客服可基于后端真实订单数据回答：买了什么、花了多少钱、下单时间、物流最新节点、客服电话等。
251→
252→**数据流/状态**
253→- `mode=smart` 下发送消息：
254→  - 若识别到订单号：后端校验订单归属（仅允许查询当前登录用户的订单），提取订单金额/下单时间/商品快照/最新物流事件，并拼接到 AI 输入文本中，再调用豆包生成回复。
255→
256→**边界条件**
257→- 未找到订单或无权限：不注入订单上下文，AI 会引导用户确认订单号或转人工。
258→- 物流节点来自后端订单事件（模拟/事件流），不保证等同真实快递对接。
259→
260→**相关文件**
261→- 后端：
262→  - `backend/app/api/v1/shop.py`
263→  - `backend/tests/test_support_ai.py`
264→
265→### 变更 2026-03-30：发订单给客服（底部弹窗 + 订单卡片）
266→
267→**目的**
268→- 点击“发订单给客服”后，从底部弹出最近 5 单列表，用户选择后发送“订单卡片”消息给智能客服，并触发基于真实订单数据的回答。
269→
270→**实现要点**
271→- 新增消息类型：`messageType=order_card`，发送时携带 `orderId`；后端落库 `support_messages.message_type=order_card`，content 存储订单快照 JSON。
272→- 小程序端在聊天页展示订单卡片；选择订单后调用发送接口并刷新消息列表。
273→
274→**相关文件**
275→- 小程序：
276→  - `PawHome/miniprogram/pages/shop/customer-service-chat/index.ts`
277→  - `PawHome/miniprogram/pages/shop/customer-service-chat/index.wxml`
278→  - `PawHome/miniprogram/pages/shop/customer-service-chat/index.wxss`
279→  - `PawHome/miniprogram/services/support.ts`
280→  - `PawHome/miniprogram/services/shop.ts`
281→- 后端：
282→  - `backend/app/api/v1/shop.py`
283→  - `backend/tests/test_support_ai.py`
284→
285→**边界条件**
286→- 所有客服接口要求登录态（`Authorization: Bearer <token>`）。
287→- 会话与消息表使用 `checkfirst=True` 自动建表，避免需要手动迁移。
288→
289→### 变更 2026-03-30：每次进入新会话 + 离开自动结束 + 展示对话时间
290→
291→**目的**
292→- 每次进入智能客服/人工客服都生成一条新的会话记录，便于历史回溯。
293→- 用户离开聊天页即结束该会话，避免历史里长期出现“进行中”的遗留会话。
294→- 历史会话与聊天页显示时间一致，并兼容秒/毫秒时间戳差异。
295→
296→**入口**
297→- 创建会话：`POST /api/v1/shop/support/conversations`（新增参数 `forceNew`）
298→- 结束会话：`POST /api/v1/shop/support/conversations/<cid>/close`
299→- 小程序入口：
300→  - 客服中心页进入智能/人工：`/pages/shop/customer-service`
301→  - 客服聊天页：`/pages/shop/customer-service-chat/index`
302→
303→**数据流/状态**
304→- 创建会话时：
305→  - `forceNew=true`：后端始终创建新会话（不复用 open 会话）。
306→- 退出聊天页时：
307→  - 小程序在 `onUnload` 调用 close 接口，将 `support_conversations.status`置为 `closed`。
308→- 时间展示：
309→  - 小程序对会话/消息时间戳做归一化：若 `< 1e12` 视为秒并转换为毫秒，再进行格式化展示。
310→
311→**相关文件**
312→- 小程序：
313→  - `PawHome/miniprogram/pages/shop/customer-service.ts`
314→  - `PawHome/miniprogram/pages/shop/customer-service.wxml`
315→  - `PawHome/miniprogram/pages/shop/customer-service-chat/index.ts`
316→  - `PawHome/miniprogram/pages/shop/customer-service-chat/index.wxml`
317→  - `PawHome/miniprogram/pages/shop/customer-service-chat/index.wxss`
318→  - `PawHome/miniprogram/services/support.ts`
319→- 后端：
320→  - `backend/app/api/v1/shop.py`
321→
322→### 变更 2026-03-30：历史会话默认仅展示 5 条 + 清理已结束会话
323→
324→**目的**
325→- 避免“每次进入都新建会话”导致历史列表过长，影响可读性与操作效率。
326→- 提供轻量清理能力：只清理已结束会话，且默认保留最近 5 条会话记录。
327→
328→**入口**
329→- 小程序：
330→  - 客服中心页“历史会话”区域：默认展示 5 条，支持“查看更多/收起”
331→  - 客服中心页“清理”按钮：弹窗确认后执行清理
332→- 后端：
333→  - 清理接口：`POST /api/v1/shop/support/conversations/cleanup`（参数 `keep`）
334→
335→**数据流/状态**
336→- 展示策略：
337→  - `historyAll` 存全量列表，`history` 存当前展示列表（默认 slice(0,5)）。
338→- 清理策略：
339→  - 仅删除 `status=closed` 的会话；
340→  - 最近 `keep` 条会话不删除（无论 open/closed），以保证最近记录可回溯。
341→
342→**相关文件**
343→- 小程序：
344→  - `PawHome/miniprogram/pages/shop/customer-service.ts`
345→  - `PawHome/miniprogram/pages/shop/customer-service.wxml`
346→  - `PawHome/miniprogram/pages/shop/customer-service.wxss`
347→  - `PawHome/miniprogram/services/support.ts`
348→- 后端：
349→  - `backend/app/api/v1/shop.py`
350→
351→---
352→
353→## 微信登录后昵称头像入库（含头像上传）
354→
355→**目的**
356→- 解决微信登录后拿不到昵称、头像路径无法被其他端使用的问题：昵称由用户输入，头像先上传再写入用户资料。
357→
358→**入口**
359→- 小程序登录成功后在首页登录页弹出“获取头像昵称”弹窗：`PawHome/miniprogram/pages/index/index`
360→- 后端上传接口：`POST /uploads`
361→- 后端用户资料更新接口：`PUT /users/me`
362→
363→**数据流/状态**
364→- `chooseAvatar` 返回本地临时路径（`wxfile://...`）：
365→  - 小程序先调用上传接口换取可访问 URL，再将 URL 写入 `userInfo.avatarUrl`
366→- 点击“完成”：
367→  - 小程序调用 `updateUserProfile({ nickname, avatarUrl })` 写入后端数据库
368→
369→**关键分支**
370→- 旧基础库兼容：`wx.getUserProfile` 走授权返回 `userInfo`，成功后同样尝试写入后端资料。
371→
372→**边界条件**
373→- 上传失败：提示“头像上传失败”，允许用户重试选择头像。
374→- 未填写昵称或未选择头像：阻止完成并提示“请先设置头像昵称”。
375→
376→**相关文件**
377→- 小程序：
378→  - `PawHome/miniprogram/pages/index/index.ts`
379→  - `PawHome/miniprogram/services/upload.ts`
380→  - `PawHome/miniprogram/services/user.ts`
381→- 后端：
382→  - `backend/app/api/v1/uploads.py`
383→  - `backend/app/api/v1/users.py`
384→
385→---
386→
387→## 商城-商品扩展（新增商品与本地商品图）
388→
389→### 变更 2026-03-30：使用 products 文件夹商品图并新增商品
390→
391→**目的**
392→- 扩充商城商品数量，丰富商品列表展示。
393→- 使用本地商品图片资源，保证小程序端可直接加载且不依赖后端静态文件服务。
394→
395→**入口**
396→- 商品列表：`GET /api/v1/shop/products`
397→- 商品详情：`GET /api/v1/shop/products/<product_id>`
398→
399→**数据流/状态**
400→- 商品图：
401→  - 将 `f:/PAWHome/products` 下的图片复制到小程序包内静态目录：`PawHome/miniprogram/assets/images/shop/products/`
402→  - 小程序侧商品图路径形如：`/assets/images/shop/products/prod_01.jpg`
403→- Mock 商品种子：
404→  - 在 `services/shop.ts` 扩展 `seedProducts()` 与 `PRODUCT_IMAGE_MAP`，新增 `p5~p21`。
405→  - `ensureSeed()` 会把新增商品合并到已有本地缓存，避免用户已有数据时看不到新商品。
406→- 后端商品种子：
407→  - 后端在商品相关接口内调用 `_ensure_shop_products_seeded()`，自动补齐 `p1~p21`（含图片路径 JSON），不依赖手动执行 seed 脚本。
408→
409→**相关文件**
410→- 小程序：
411→  - `PawHome/miniprogram/services/shop.ts`
412→  - `PawHome/miniprogram/assets/images/shop/products/*`
413→- 后端：
414→  - `backend/app/api/v1/shop.py`
415→
416→### 变更 2026-03-30：校正商品图文与详情页信息
417→
418→**目的**
419→- 修复新增商品后出现的“图片与商品名称/描述不对应”问题。
420→- 让商品详情页的“适用信息/问答/评价标签”随品类变化，避免所有商品都显示同一套文案。
421→
422→**实现要点**
423→- 商品数据：
424→  - 依据 `prod_01~prod_17.jpg` 图片内容，统一调整 `p5~p21` 的 `name/desc/price/specs`（小程序 Mock 与后端种子保持一致）。
425→  - 小程序 Mock 的 `ensureSeed()` 对已缓存的商品数据做“按 seed 更新”，避免老缓存导致仍显示旧文案。
426→- 详情页展示：
427→  - 详情页根据 `product.id` 归类（猫粮/狗粮/玩具/猫抓板/猫砂盆/宠物床等），动态生成适用信息、问答与评价标签。
428→
429→### 变更 2026-03-30：商品图改为后端 /media（不打包进小程序）
430→
431→**目的**
432→- 降低小程序包体，商品图片不再放在 `miniprogram/assets` 内。
433→- 数据库仅存图片 URL（`/media/prod_XX.jpg`），小程序端自动拼接为可访问的绝对地址。
434→
435→**实现要点**
436→- 图片导入：
437→  - 将 `f:/PAWHome/products` 下图片复制到后端 `backend/instance/uploads/`，命名为 `prod_01~prod_17.jpg`。
438→  - 后端通过 `GET /media/<filename>` 提供静态访问。
439→- 商品数据：
440→  - `ShopProduct.images_json` 存储 `/media/prod_XX.jpg`（数组 JSON），后端商品接口直接返回该路径。
441→- 小程序展示：
442→  - 对 `imageUrl` 做 URL 归一化：`/media/...` 自动转为 `http(s)://<origin>/media/...`；`/assets/...` 保持不变。
443→
444→**相关文件**
445→- 小程序：
446→  - `PawHome/miniprogram/services/shop.ts`
447→- 后端：
448→  - `backend/app/__init__.py`
449→  - `backend/app/api/v1/shop.py`
450→
451→### 变更 2026-03-30：启动页/商城广告大图迁移到后端 /media
452→
453→**目的**
454→- 进一步减小小程序包体：启动页背景、商城广告位等大图不再随包发布。
455→
456→**实现要点**
457→- 将以下图片迁移到后端 `backend/instance/uploads/`：
458→  - `splash-bg.png`（启动页/登录页背景）
459→  - `shop_banner.png`（商城广告位）
460→  - `startup.png`（历史遗留启动图）
461→- 小程序页面运行时根据 `getBaseUrl()` 计算 `origin`，拼出实际访问地址：
462→  - `${origin}/media/splash-bg.png`
463→  - `${origin}/media/shop_banner.png`
464→- 删除小程序包内对应图片文件，避免重复占用体积。
465→
466→**相关文件**
467→- 小程序：
468→  - `PawHome/miniprogram/pages/splash/index.ts`
469→  - `PawHome/miniprogram/pages/splash/index.wxml`
470→  - `PawHome/miniprogram/pages/home/index.ts`
471→  - `PawHome/miniprogram/pages/home/index.wxml`
472→  - `PawHome/miniprogram/pages/shop/index.ts`
473→- 后端：
474→  - `backend/app/__init__.py`
475→
476→### 变更 2026-03-30：主页/商店广告图加载失败兜底
477→
478→**目的**
479→- 避免后端 `/media` 图片在弱网/域名未配置时加载失败导致页面出现可点击但空白的广告位。
480→
481→**实现要点**
482→- 为首页广告图与商城 Banner 增加图片加载失败事件处理：
483→  - 失败时回退到小程序内置轻量图 `assets/images/home/advertise@1x.png` 作为占位，保证视觉不空白且仍可跳转。
484→- 首页广告图同时兼容后端下发的 `promo.imageUrl`：对相对路径自动补全为绝对 URL，并在该分支也绑定加载失败兜底。
485→- 首页广告图默认与商城页 Banner 保持一致：统一使用 `/media/shop_banner.png`。
486→
487→**相关文件**
488→- 小程序：
489→  - `PawHome/miniprogram/pages/home/index.ts`
490→  - `PawHome/miniprogram/pages/home/index.wxml`
491→  - `PawHome/miniprogram/pages/shop/index.ts`
492→  - `PawHome/miniprogram/pages/shop/index.wxml`
493→
494→---
495→
496→## 评论通知展示评论内容与帖子缩略图
497→
498→**目的**
499→- 消息页“评论”Tab 能直接看到对方评论的内容，并在有媒体时展示帖子缩略图。
500→
501→**入口**
502→- 小程序消息页：`PawHome/miniprogram/pages/messages/index`
503→- 后端通知列表：`GET /notifications`
504→
505→**数据流/状态**
506→- 后端在通知列表中：
507→  - `content`：根据 `comment_id` 读取 `Comment.content`
508→  - `thumbUrl`：从 `Post.media_json` 解析首图或视频封面
509→- 小程序消息页：
510→  - `content` 非空时展示第三行引用文本
511→  - `thumbUrl` 非空时展示右侧缩略图
512→
513→**相关文件**
514→- 小程序：
515→  - `PawHome/miniprogram/pages/messages/index.ts`
516→  - `PawHome/miniprogram/pages/messages/index.wxml`
517→- 后端：
518→  - `backend/app/api/v1/notifications.py`
519→  - `backend/app/models.py`
520→
521→---
522→
523→## 帖子/评论/互动消息时间统一为北京时间输出
524→
525→**目的**
526→- 修复帖子、评论、互动消息时间显示整体偏差（常见表现为“都晚 8 小时”）。
527→
528→**实现要点**
529→- 后端对外输出统一按北京时间序列化：
530→  - `posts/comments` 的 `createdAt/updatedAt` 返回带 `+08:00` 的 ISO 字符串
531→  - `notifications` 的 `createdAt` 返回稳定的 epoch 毫秒时间戳
532→
533→**边界条件**
534→- 数据库存储仍以 UTC 为准；对外输出时做时区转换，避免客户端解析无时区 ISO 字符串导致偏移。
535→
536→**相关文件**
537→- 小程序：
538→  - `PawHome/miniprogram/utils/date.ts`
539→  - `PawHome/miniprogram/pages/community/index.ts`
540→  - `PawHome/miniprogram/pages/post-detail/index.ts`
541→  - `PawHome/miniprogram/pages/messages/index.ts`
542→- 后端：
543→  - `backend/app/timeutil.py`
544→  - `backend/app/api/v1/posts.py`
545→  - `backend/app/api/v1/comments.py`
546→  - `backend/app/api/v1/notifications.py`
547→
548→---
549→
550→## 消息页评论通知与“我评论的”分栏
551→
552→**目的**
553→- 消息页评论 Tab 既能看“评论我的/回复我的”，也能看“我评论的”；并支持从消息快速跳到对方主页与对应帖子的评论位置。
554→
555→**入口**
556→- 小程序消息页：`PawHome/miniprogram/pages/messages/index`
557→- 后端通知列表：`GET /notifications?type=comment`
558→- 后端我的评论列表：`GET /users/me/comments`
559→
560→**数据流/状态**
561→- 评论 Tab 二级分栏：
562→  - `commentSubTab=toMe`：展示后端通知返回的评论互动（别人评论/回复我）
563→  - `commentSubTab=byMe`：展示“我评论的”列表（我发出的评论/回复）
564→- 评论卡片展示字段：
565→  - `text`：动作文案（如“评论了你的帖子”“回复了你的评论”）
566→  - `commentText`：对方（或我）实际发出的评论内容
567→  - `content`：引用内容（被回复的原评论，或对应帖子正文摘要）
568→
569→**关键分支**
570→- 创建评论时后端区分：
571→  - 直接评论帖子：通知帖子作者，`text="评论了你的帖子"`
572→  - 回复评论：通知被回复评论作者，`text="回复了你的评论"`
573→- 点击交互：
574→  - 点击头像/昵称：跳转 `user-profile`（需要后端返回 `actorId/userId`）
575→  - 点击评论卡片：跳转帖子详情并携带 `commentId`，帖子详情通过 `scroll-into-view` 定位到对应评论节点
576→
577→**边界条件**
578→- 若 `commentId` 缺失：仍可跳转帖子详情但不定位。
579→- “我评论的”列表默认加载首页分页（page=1,pageSize=20），可按需后续扩展分页/下拉刷新。
580→
581→**相关文件**
582→- 小程序：
583→  - `PawHome/miniprogram/pages/messages/index.ts`
584→  - `PawHome/miniprogram/pages/messages/index.wxml`
585→  - `PawHome/miniprogram/pages/messages/index.wxss`
586→  - `PawHome/miniprogram/services/notifications.ts`
587→  - `PawHome/miniprogram/services/comments.ts`
588→  - `PawHome/miniprogram/pages/post-detail/index.ts`
589→  - `PawHome/miniprogram/pages/post-detail/index.wxml`
590→- 后端：
591→  - `backend/app/api/v1/comments.py`
592→  - `backend/app/api/v1/notifications.py`
593→
594→### 变更 2026-03-28：评论内容不展示修复（commentText 兜底）
595→
596→**问题现象**
597→- 消息页 → 评论 → 评论我的：仅展示“评论了你的帖子/回复了你的评论”等动作文案，但看不到对方具体评论内容。
598→
599→**根因**
600→- 历史/不完整通知数据中可能存在 `comment_id` 缺失或不稳定的情况，导致通知列表接口无法通过 `comment_id` 回查 `Comment`，从而 `commentText` 为空，前端 `wx:if="{{item.commentText}}"` 不渲染评论正文。
601→
602→**修复方案**
603→- 后端 `GET /notifications` 对评论类通知补齐 `commentText` 回填兜底：
604→  - 优先使用 `comment_id` 查 `Comment.content`
605→  - 若 `comment_id` 不存在但具备 `post_id + actor_id`，则回查该用户在该帖的最近一条评论作为 `commentText`
606→  - 若仍为空，返回占位文本“（评论内容为空）”保证前端可渲染
607→
608→**影响面**
609→- 评论我的列表将稳定展示“对方评论内容”（commentText），以及引用块展示“我的原帖/原评论内容”（content）。
610→
611→---
612→
613→## 发帖宠物标签生成（去掉宠物名字标签）
614→
615→**目的**
616→- 发帖时选择宠物，不再自动添加“自己宠物名字”的标签；仅保留“宠物类型”和“品种”的标签。
617→
618→**入口**
619→- 小程序发帖页：`PawHome/miniprogram/pages/post-create/index`
620→  - 标记宠物：`tagPet()`
621→  - 发布：`publish()`
622→
623→**数据流/状态**
624→- 选择宠物后在页面状态里记录：
625→  - `pet`：仅用于页面显示（不再用于拼接标签）
626→  - `petBreed`：用于生成 `#品种` 标签
627→  - `petRawType`：作为类型兜底（当无法映射为猫/狗时使用）
628→  - `taggedPetType/petType`：用于后端 `type` 字段（帖子类型分类）
629→- 发布时对正文内容的拼接规则：
630→  - 保留原 `content` 与 `topic`
631→  - 追加类型标签：`#猫咪` / `#狗狗`；若无法识别则追加 `#<petRawType>`
632→  - 追加品种标签：`#<petBreed>`
633→  - 不再追加 `#<petName>`
634→
635→**关键分支**
636→- 若用户正文/话题里已包含相同标签，则发布时不重复追加。
637→- 若既无猫/狗类型标签也无 `petRawType`，则不追加类型标签。
638→
639→**边界条件**
640→- `petBreed` 为空：不生成品种标签。
641→- `petRawType` 为空：无法识别类型时不生成兜底类型标签。
642→
643→**相关文件**
644→- 小程序：
645→  - `PawHome/miniprogram/pages/post-create/index.ts`
646→
647→---
648→
649→## 主页热门帖子投送（Top4）与推荐流新帖置顶
650→
651→**目的**
652→- 主页广告投送下方展示 4 条热度最高的帖子，提升内容推荐效率。
653→- 社区“推荐”标签下，自己 1 小时内新发帖子优先置顶，避免被旧帖淹没。
654→
655→**入口**
656→- 后端：
657→  - `GET /feeds/community?mode=hot&page=1&pageSize=4`：主页热门帖子卡片数据源
658→  - `GET /posts?tab=recommend&type=...`：社区推荐列表（第一页包含置顶新帖）
659→- 小程序：
660→  - 主页：`PawHome/miniprogram/pages/home/index`
661→  - 社区：`PawHome/miniprogram/pages/community/index`
662→
663→**数据流/状态**
664→- 主页热门帖子：
665→  - 后端聚合 `PostHistory` 得出浏览数（viewCount），结合 `Post.like_count/comment_count` 排序取前 4 条
666→  - 前端请求后渲染为 2x2 网格卡片，点击进入帖子详情
667→- 社区推荐置顶：
668→  - 后端在 `tab=recommend` 时，计算“我 1 小时内新发帖子”作为 pinned 列表
669→  - 返回列表顺序为：`pinned + rest`，并按该组合序列做分页，避免翻页重复
670→
671→**关键分支**
672→- `mode=hot`：按浏览数 → 点赞数 → 评论数 → 发布时间排序
673→- `tab=recommend`：仅对“推荐”流启用置顶逻辑；其它 tab 仍按原规则排序
674→
675→**边界条件**
676→- pinned 数量可能超过 pageSize：按组合序列分页，第一页只返回前 pageSize 条 pinned
677→- pinned 数量为 0：退化为原推荐排序
678→
679→**相关文件**
680→- 小程序：
681→  - `PawHome/miniprogram/pages/home/index.ts`
682→  - `PawHome/miniprogram/pages/home/index.wxml`
683→  - `PawHome/miniprogram/pages/home/index.wxss`
684→  - `PawHome/miniprogram/services/banners.ts`
685→- 后端：
686→  - `backend/app/api/v1/feeds.py`
687→  - `backend/app/api/v1/posts.py`
688→
689→### 变更 2026-03-29：主页热门推送缺图随机补齐封面
690→
691→**问题现象**
692→- 主页热门帖子（Top4）中存在 `imageUrl` 为空的帖子，导致卡片封面显示为统一的默认图，影响内容感知。
693→
694→**修复方案**
695→- 仅在主页推送展示层做封面兜底：当 `imageUrl` 为空时，从后端静态资源 `/media/推送1.jpg~推送5.jpg` 中按 `post.id` 计算一个稳定的“随机”索引，生成 `coverUrl` 用于渲染。
696→- 不写回后端，不修改原帖 `media_json` 与帖子内容。
697→
698→**相关文件**
699→- `PawHome/miniprogram/pages/home/index.ts`
700→- `PawHome/miniprogram/pages/home/index.wxml`
701→
702→---
703→
704→## 主页广告卡片与社区入口卡片防重叠布局
705→
706→**目的**
707→- 修复首页“广告”卡片与“社区”入口卡片在视觉上贴得过近、阴影/徽标区域看起来“撞一起”的问题。
708→
709→**入口**
710→- 小程序首页：`PawHome/miniprogram/pages/home/index`
711→
712→**实现要点**
713→- 调整广告卡片容器 `.group1` 的底部外边距，保证阴影位移（translate）与黑色边框下方留有足够间距。
714→- 将社区入口卡片容器 `.group` 的顶部外边距归零，把垂直间距统一交由上一块的 `margin-bottom` 控制，避免相邻块外边距折叠带来的间距不稳定。
715→
716→**边界条件**
717→- 兼容不同屏幕高度与字体渲染差异：通过“固定间距 + 阴影位移预留”避免视觉重叠。
718→
719→**相关文件**
720→- `PawHome/miniprogram/pages/home/index.wxss`
721→
722→### 变更 2026-03-29：首页商城广告与商城页广告统一
723→
724→**目的**
725→- 让首页引流到商城的广告视觉与商城页顶部广告一致，避免出现两套素材。
726→
727→**实现要点**
728→- 首页两个“去商城”的广告位（右侧竖卡 + 粉色广告卡片的无配置兜底图）统一改为使用商城页同款本地素材 `/assets/images/shop/广告.png`。
729→
730→**相关文件**
731→- `PawHome/miniprogram/pages/home/index.wxml`
732→- `PawHome/miniprogram/pages/shop/index.ts`
733→
734→### 变更 2026-03-29：首页商城广告改为“纯图片”展示
735→
736→**目的**
737→- 首页商城广告位效果对齐商城页：直接渲染图片 banner，不再包裹卡片容器、阴影与边框结构。
738→
739→**实现要点**
740→- 轮播右侧商城广告位改为单个 `<image>`（`mode="widthFix"`），用于跳转商城。
741→- 原首页粉色广告卡片改为单个 `<image>` banner（优先使用 `promo.imageUrl`，无配置则使用商城同款本地素材）。
742→
743→**相关文件**
744→- `PawHome/miniprogram/pages/home/index.wxml`
745→- `PawHome/miniprogram/pages/home/index.wxss`
746→
747→#### 回退 2026-03-29：仅保留主广告为纯图片
748→
749→**说明**
750→- 轮播右侧“去商城”广告恢复为原卡片容器样式；仅保留主页主广告推送为纯图片 banner 展示。
751→
752→### 变更 2026-03-29：首页金刚区与推送模块间距调整
753→
754→**目的**
755→- 缩小首页金刚区（服务入口）与商城广告推送、社区推送之间的垂直留白，让内容更紧凑。
756→
757→**实现要点**
758→- 调整 `.home-shop-hero-banner` 的上下外边距，降低金刚区到广告推送、以及广告推送到社区入口的间距。
759→
760→**相关文件**
761→- `PawHome/miniprogram/pages/home/index.wxss`
762→
763→#### 微调 2026-03-29：进一步收紧留白
764→
765→**实现要点**
766→- 同时下调 `.services` 的 `margin-bottom` 与 `.home-shop-hero-banner` 的上下外边距，使金刚区到广告推送、广告推送到社区入口更紧凑。
767→
768→---
769→
770→## 评论删除按钮样式优化
771→
772→**目的**
773→- 优化帖子详情页评论区“删除”按钮观感，避免纯文本操作项不够像可点击控件、且与其它操作不一致。
774→
775→**入口**
776→- 帖子详情页：评论列表项右下角操作区（删除/置顶）。
777→
778→**实现要点**
779→- 将删除操作从纯文本样式调整为胶囊按钮：增加边框、底色、圆角与可点击区域。
780→- 删除按钮使用危险态配色（浅红底 + 红字），并增加按下反馈（透明度变化）。
781→
782→**相关文件**
783→- `PawHome/miniprogram/pages/post-detail/index.wxml`
784→- `PawHome/miniprogram/pages/post-detail/index.wxss`
785→
786→---
787→
788→## 疫苗记录与导入链路
789→
790→**目的**
791→- 为宠物疫苗场景提供独立的记录查看、预约、提醒和记录导入入口，避免首页疫苗入口继续落到通用服务页后再二次分流。
792→
793→**入口**
794→- 小程序首页金刚区点击“疫苗”：`PawHome/miniprogram/pages/home/index`
795→- 疫苗记录页底部操作区点击“添加记录”：`PawHome/miniprogram/pages/vaccine/record/index`
796→
797→**数据流/状态**
798→- 首页 `goServiceVaccine` 直接跳转到 `pages/vaccine/record/index`，形成疫苗业务独立入口。
799→- `app.json` 注册 `record / import / appointment / reminder / success` 五个疫苗页面，保证页面栈跳转和开发者工具编译都能正确识别路由。
800→- 疫苗记录页通过 `petIndex` 和 `activeTab` 维护当前宠物与记录分组，切换时调用 `refreshRecords` 刷新当前展示数据。
801→- 用户在记录页点击“添加记录”后进入 `pages/vaccine/import/index`，导入完成后再回跳到记录页，形成闭环。
802→
803→**关键分支**
804→- 首页只有“疫苗”入口改为独立路由；“美容 / 医疗 / 寄养”仍沿用 `pages/service/index?type=...` 的通用服务预约流程。
805→- 记录页底部提供三条分支：预约、提醒、导入，分别跳转到对应疫苗子页面。
806→- 导入页当前支持“相册导入”和“拍照扫描”两条采集路径，提交后跳回记录页。
807→
808→**边界条件**
809→- 若 `app.json` 未注册疫苗页面，即使页面目录存在，也会在跳转或开发者工具编译时出现找不到页面的错误。
810→- 导入页目前是前端占位流程，图片选择成功后仅反馈提示，不包含真实上传、识别和落库逻辑。
811→- 记录页当前数据仍为 mock，导入回跳保证链路完整，但不会持久化新增记录。
812→
813→**相关文件**
814→- `PawHome/miniprogram/app.json`
815→- `PawHome/miniprogram/pages/home/index.ts`
816→- `PawHome/miniprogram/pages/home/index.wxml`
817→- `PawHome/miniprogram/pages/vaccine/record/index.ts`
818→- `PawHome/miniprogram/pages/vaccine/record/index.wxml`
819→- `PawHome/miniprogram/pages/vaccine/import/index.ts`
820→- `PawHome/miniprogram/pages/vaccine/import/index.wxml`
821→
822→---
823→
824→## 小程序列表渲染 key 唯一性（主页轮播）
825→
826→**目的**
827→- 避免 `wx:for` 渲染时因 `wx:key` 重复触发告警与节点复用异常。
828→
829→**入口**
830→- 小程序主页：`PawHome/miniprogram/pages/home/index`
831→
832→**数据流/状态**
833→- 主页轮播数据 `swiperList` 以对象数组维护，每个元素包含稳定的 `id` 与展示用 `src`。
834→
835→**关键分支**
836→- `wx:key` 不使用 `src`（图片路径可能重复），改为使用稳定且唯一的 `id`。
837→
838→**边界条件**
839→- 即使多张轮播使用同一张图片（同一路径），也不会出现重复 key。
840→
841→**相关文件**
842→- `PawHome/miniprogram/pages/home/index.wxml`
843→- `PawHome/miniprogram/pages/home/index.ts`
844→
845→### 变更 2026-03-29：删除/置顶收纳到“更多”菜单
846→
847→**问题现象**
848→- 评论列表里直接展示“删除/置顶”文字会显得信息噪声很大，观感不够干净。
849→
850→**修复方案**
851→- 评论操作区改为仅保留点赞与“…”更多按钮；点击“…”弹出 ActionSheet 展示可用操作：
852→  - 作者在自己帖子下可看到“置顶/取消置顶”
853→  - 可删除评论的用户看到“删除评论”
854→
855→**相关文件**
856→- `PawHome/miniprogram/pages/post-detail/index.ts`
857→- `PawHome/miniprogram/pages/post-detail/index.wxml`
858→
859→---
860→
861→## 删除帖子（帖子弹窗入口）
862→
863→**目的**
864→- 支持作者在帖子详情页快速删除自己发布的帖子，并自动刷新社区/个人主页相关列表。
865→
866→**入口**
867→- 帖子详情页 → 右上角“…”打开帖子弹窗（分享弹窗）→ 操作区“删除帖子”（仅作者可见）。
868→
869→**数据流/状态**
870→- 前端调用 `DELETE /posts/<post_id>` 删除帖子；删除成功后写入 `community_need_refresh` 与 `user_profile_need_refresh`，并返回上一页触发列表刷新。
871→
872→**关键分支**
873→- 非作者不展示入口；后端仍会做二次校验并返回 403。
874→- 删除前弹出二次确认弹窗，避免误删。
875→
876→**相关文件**
877→- `PawHome/miniprogram/pages/post-detail/index.ts`
878→- `PawHome/miniprogram/pages/post-detail/index.wxml`
879→- `PawHome/miniprogram/pages/post-detail/index.wxss`
880→- `PawHome/miniprogram/services/posts.ts`
881→- `backend/app/api/v1/posts.py`
882→
883→---
884→
885→## 关注状态同步（从帖子页进入个人主页）
886→
887→**目的**
888→- 修复“在帖子里关注用户后，进入其个人主页仍显示未关注”的状态不同步问题。
889→
890→**根因**
891→- 个人主页页内 `isFollowing` 未从接口返回结果初始化，默认值始终为 `false`。
892→- 后端 `GET /users/<id>` profile 未返回“我是否关注 TA”的关系字段，前端无法正确赋值。
893→
894→**修复方案**
895→- 后端用户资料返回补充 `isFollowing/isFollowed`（基于 `follows` 表判断）。
896→- 小程序个人主页在 `initPage/onShow` 刷新时从 `userInfo.isFollowing` 初始化/更新 `isFollowing`。
897→- 帖子详情页关注/取关成功后写入 `user_profile_need_refresh`，保证返回后页面可刷新。
898→
899→**相关文件**
900→- 后端：`backend/app/api/v1/users.py`
901→- 小程序：`PawHome/miniprogram/pages/user-profile/index.ts`
902→- 小程序：`PawHome/miniprogram/services/user.ts`
903→- 小程序：`PawHome/miniprogram/pages/post-detail/index.ts`
904→
905→---
906→
907→## 视频帖详情页空白显示修复
908→
909→**问题现象**
910→- 视频帖子进入帖子详情页后，媒体区域显示空白（无视频画面/控件）。
911→
912→**根因**
913→- 视频节点复用 `.swiper-img { height: 100% }` 样式，但视频容器未设置明确高度，导致高度计算为 0。
914→
915→**修复方案**
916→- 视频容器与 `<video>` 节点按 `mediaHeight` 设置固定高度（与图片轮播一致的高度策略），保证可见并可播放。
917→
918→**相关文件**
919→- `PawHome/miniprogram/pages/post-detail/index.wxml`
920→- `PawHome/miniprogram/pages/post-detail/index.ts`
921→
922→### 变更 2026-03-29：视频按比例自适应与白底
923→
924→**目的**
925→- 视频帖子展示尽量贴合视频本身比例，避免黑边；同时让留白背景统一为白色，观感更干净。
926→
927→**实现要点**
928→- 监听 `<video>` 的 `loadedmetadata`，根据 `width/height` 计算建议高度并更新 `mediaHeight`（做最小/最大高度限制）。
929→- 视频容器与视频节点背景统一为白色（`mediaBgColor = #ffffff`）。
930→- 打开 `show-mute-btn` 方便用户快速确认/切换静音状态；播放失败时提示 toast。
931→
932→### 变更 2026-03-29：视频封面缩略图兜底（发帖页/社区列表）
933→
934→**问题现象**
935→- 发帖页选择视频后缩略图区域空白；社区列表中视频帖无封面时卡片不展示媒体区，观感不完整。
936→
937→**修复方案**
938→- 发帖页视频缩略图优先展示 `thumbTempFilePath`，拿不到则显示占位图。
939→- 社区列表媒体区判断增加 `videoUrl`，当视频帖无 `images[0]` 时使用占位图并叠加播放角标。
940→
941→**相关文件**
942→- `PawHome/miniprogram/pages/post-create/index.wxml`
943→- `PawHome/miniprogram/pages/community/index.wxml`
944→- `PawHome/miniprogram/pages/community/index.wxss`
945→
946→### 变更 2026-03-29：视频封面懒生成写回（打开帖子自动补齐）
947→
948→**需求**
949→- 对历史/异常数据：视频帖没有 `coverUrl` 时，社区列表只能显示占位图；希望在用户点进帖子后自动生成封面并写回，后续列表展示为真实封面。
950→
951→**实现方案**
952→- 后端新增 `POST /posts/<post_id>/cover`：
953→  - 若视频帖已有 `coverUrl`：直接返回
954→  - 若缺失：从本地 `instance/uploads` 的视频文件抽帧生成 jpg，写回 `Post.media_json.coverUrl` 并返回 `coverUrl`（优先使用 OpenCV；否则使用 `imageio-ffmpeg` 调用 ffmpeg）
955→- 前端帖子详情页在加载视频帖且封面缺失时调用该接口；成功后更新 `post.images[0]`，并置位 `community_need_refresh` 触发返回列表刷新。
956→
957→**相关文件**
958→- 后端：`backend/app/api/v1/posts.py`
959→- 后端：`backend/requirements.txt`
960→- 小程序：`PawHome/miniprogram/services/posts.ts`
961→- 小程序：`PawHome/miniprogram/pages/post-detail/index.ts`
962→
963→---
964→
965→## 私信（聊天）页：REST 轮询实时收消息
966→
967→**目的**
968→- 支持用户之间私信对话：可进入会话、发送文本消息、并在仅有 REST 接口时通过轮询实现“实时收消息”体验。
969→
970→**入口**
971→- 消息页私信列表进入：`PawHome/miniprogram/pages/messages/index`
972→- 个人主页私信按钮进入：`PawHome/miniprogram/pages/user-profile/index`
973→- 聊天页：`PawHome/miniprogram/pages/chat/index`
974→
975→**数据流/状态**
976→- 会话创建：
977→  - 若路由参数未带 `id` 但带 `peerId`，聊天页会调用 `createConversation(peerId)` 获取 `conversationId` 后再拉取消息与发送。
978→- 消息拉取与展示：
979→  - 进入页后先 `listMessages(conversationId)` 拉取消息并映射为 UI 消息（区分 me/them）。
980→  - `onShow`/进入页后启动轮询：周期性调用 `listMessages(conversationId)` 拉取最新列表。
981→  - 消息合并：将服务端消息与本地乐观消息（pending/failed）做去重合并，避免轮询刷新导致丢失或闪动。
982→- 已读同步：
983→  - 进入会话与收到对端新消息后调用 `markConversationRead(conversationId)`，用于清空未读并让消息页汇总展示保持一致。
984→
985→**关键分支**
986→- 发送消息采用乐观更新：先插入 `pending`，发送成功后用返回结果回填 `id/status`；失败标记 `failed` 并提示。
987→- 轮询仅在聊天页可见时运行：`onHide/onUnload` 停止，避免后台无效请求。
988→
989→**边界条件**
990→- 若后端未回传 `clientMsgId`：前端会对“我发送的本地消息”做弱去重（文本一致且时间接近）降低重复概率。
991→- 会话未就绪时发送：阻止发送并提示“会话未就绪”。
992→
993→**相关文件**
994→- `PawHome/miniprogram/pages/chat/index.ts`
995→- `PawHome/miniprogram/pages/chat/index.wxml`
996→- `PawHome/miniprogram/pages/chat/index.wxss`
997→- `PawHome/miniprogram/services/im.ts`
998→
999→### 变更 2026-03-29：修复输入框被页面顶部 padding 挤出视口
1000→
1001→**问题现象**
1002→- 聊天页能看到空态/消息列表，但底部发送输入栏不显示。
1003→
1004→**根因**
1005→- 页面根容器设置了 `height: 100vh` 同时叠加 `padding-top`，在部分环境下会导致底部内容被裁切；叠加页面转场使用 `transform` 时，`position: fixed` 也可能变为相对该容器定位，进一步放大了裁切问题。
1006→
1007→**修复方案**
1008→- 将聊天页根容器设为 `box-sizing: border-box`，使 `padding-top` 纳入 100vh 计算，并设置 `position: relative` 以稳定绝对定位子元素的参考坐标。
1009→
1010→### 变更 2026-03-29：私信时间统一按北京时间与消息页返回修复
1011→
1012→**问题现象**
1013→- 私信列表时间显示与预期不一致（常见于后端返回无时区的时间字符串时，解析偏差 8 小时）。
1014→- 从社区进入消息页 → 进入私信会话 → 返回到消息页后，再返回可能回到私信页而非社区页。
1015→
1016→**修复方案**
1017→- 时间：IM 时间字段兼容秒/毫秒时间戳与无时区字符串，并将日期展示固定按北京时间计算。
1018→- 返回：消息页返回统一 `switchTab` 回到社区首页，避免误回到私信页或帖子详情页。
1019→
1020→### 变更 2026-03-29：私信时间仍偏差与聊天页自己的头像不正确修复
1021→
1022→**问题现象**
1023→- 部分后端返回无时区时间字符串时，私信时间仍可能固定偏差 8 小时（常见于后端实际输出为 UTC 但未带 `Z/+08:00`）。
1024→- 聊天页右侧“自己”的头像使用了占位图，而不是数据库里存的头像。
1025→
1026→**修复方案**
1027→- 时间：无时区时间字符串默认按 UTC 解析；若解析结果明显落在未来（超过 5 分钟），则回退按北京时间解析，兼容不同后端输出习惯。
1028→- 头像：聊天页启动时调用 `getUserProfile()` 获取当前用户资料，并用返回的 `avatarUrl` 作为自己的头像。
1029→
1030→### 变更 2026-03-29：新会话首条消息发送失败修复
1031→
1032→**问题现象**
1033→- 第一次进入某个用户的私信会话时，首条消息容易发送失败；第二条开始恢复正常。
1034→
1035→**根因**
1036→- App 启动阶段 `token` 写入 storage 是异步的；在 token 尚未就绪时调用 IM 后端接口会失败。
1037→- 会话 id 创建失败时，非 Mock 模式下不应使用本地 `conv_mock_*` 兜底 id 去调用真实后端。
1038→
1039→**修复方案**
1040→- 非 Mock 模式：发送/建会话前等待 token 就绪（短轮询等待），token 仍不存在则提示“登录中，请稍后”并阻止发送。
1041→- 仅在 Mock 模式下才允许使用 `conv_mock_*` 作为兜底会话 id。
1042→
1043→### 变更 2026-03-29：首条消息入库但页面不显示、头像空值与个人资料生日可选
1044→
1045→**问题现象**
1046→- 新开启私信时，首条消息已成功写入数据库，但聊天页列表不显示（第二条开始正常）。
1047→- 用户未设置头像时，聊天页会显示默认网络头像而非空白占位。
1048→- 编辑个人资料时生日不填写会导致保存失败。
1049→
1050→**根因**
1051→- 聊天页 `onLoad` 与用户快速发送同时触发建会话，可能拿到两个不同的 `conversationId`，导致消息写入 A 会话但页面展示 B 会话。
1052→- 聊天页为自己的头像设置了默认兜底图。
1053→- 个人资料保存时把 `birthday=""` 作为字段提交，后端校验不通过。
1054→
1055→**修复方案**
1056→- 会话：聊天页引入单例 `ensureConversationId()`，统一创建/复用会话，避免并发建会话导致错会话。
1057→- 头像：头像为空时显示空白圆形占位，不再使用默认网络头像兜底。
1058→- 资料保存：仅提交用户实际填写的字段（生日为空时不提交该字段）。
1059→
1060→### 变更 2026-03-29：发送成功后强制刷新消息列表（兜底）
1061→
1062→**目的**
1063→- 避免在极端时序（setData/轮询/建会话）下出现“消息已入库但本地列表未及时合并”的展示不一致。
1064→
1065→**实现要点**
1066→- `onLoad` 使用 `ensureConversationId()` 的返回值作为入参拉取消息，避免依赖 `setData` 时序。
1067→- `sendMessage` 成功后额外 `loadMessages(conversationId)` 以服务端结果为准刷新列表。
1068→
1069→### 变更 2026-03-29：聊天消息渲染使用稳定 key
1070→
1071→**问题现象**
1072→- 在特定情况下（尤其首条消息发送后），消息已写入数据库且接口返回正常，但页面列表可能丢失/只显示后续消息。
1073→
1074→**根因**
1075→- 消息列表渲染使用 `wx:key="id"`，而“我方乐观消息”的 `id` 会在发送成功后从 `clientMsgId` 替换为后端返回的真实 `id`，导致 key 发生变化；在微信小程序列表 diff 场景下可能触发节点复用异常，表现为某些消息不渲染。
1076→
1077→**修复方案**
1078→- 给每条消息增加稳定的渲染 key：服务端消息用 `id`，乐观消息用 `clientMsgId`，列表使用 `wx:key="renderKey"`，即使消息真实 `id` 更新也不会改变渲染 key。
1079→
1080→### 变更 2026-03-29：服务端消息列表以远端为准渲染
1081→
1082→**问题现象**
1083→- 服务端接口已返回多条消息，但页面偶发只展示最新一条。
1084→
1085→**修复方案**
1086→- 聊天页渲染以服务端消息列表为主（完整覆盖），仅保留本地 `pending/failed` 且服务端未出现的消息作为补充，避免本地合并逻辑导致列表异常。
1087→
1088→### 变更 2026-03-29：滚动到底部改为 scrollTop
1089→
1090→**问题现象**
1091→- 空会话发出第一条消息后，空态消失但消息也看不到，页面呈现空白；继续发第二条后才“看起来正常”。
1092→
1093→**根因**
1094→- 使用 `scroll-into-view` 滚动到锚点时，锚点可能会对齐到视口顶部；当消息数量很少时，实际消息节点会被滚动到视口上方而不可见。
1095→
1096→**修复方案**
1097→- 改用 `scroll-top` 设置一个足够大的值（并用 2 个值交替触发更新）来保证滚动到底部，不依赖锚点对齐行为。
1098→
1099→### 变更 2026-03-29：首条私信“不可见引导消息”兜底
1100→
1101→**背景**
1102→- 在部分环境下，新会话发送第一条消息后，页面可能出现“空白/不展示第一条”的体验问题。
1103→
1104→**兜底策略**
1105→- 若检测到该会话当前无历史消息，则在用户发送第一条真实消息前，先向同一会话发送一条“引导消息”，用于触发对话进入稳定状态；随后立刻发送用户真实消息。
1106→- 引导消息内容可配置：默认使用“默认消息”用于联调排查（可改回不可见字符）。
1107→
1108→### 变更 2026-03-29：私信时间修复与聊天页时间格式
1109→
1110→**问题现象**
1111→- 消息页私信列表出现“8小时前”等不符合实际的时间（刚发起会话也显示很久以前）。
1112→- 聊天页缺少每条消息的具体发送时间展示。
1113→
1114→**根因**
1115→- 后端使用无时区 `datetime` 直接调用 `timestamp()`，会按服务器本地时区解释，导致 epoch 毫秒值偏差 8 小时。
1116→
1117→**修复方案**
1118→- 后端 IM：无时区 `datetime` 按 UTC 处理后再计算 epoch 毫秒时间戳，避免偏差。
1119→- 小程序聊天页：按北京时间展示消息时间：
1120→  - 当天：`HH:mm`
1121→  - 非当天但同年：`MM-DD HH:mm`
1122→  - 非同年：`YYYY-MM-DD HH:mm`
1123→
1124→### 变更 2026-03-29：聊天页去掉空态文案
1125→
1126→**目的**
1127→- 私信页在无历史消息时也保持“纯对话界面”，不展示居中文案，减少干扰。
1128→
1129→**实现要点**
1130→- 移除聊天页消息列表的空态节点，仅保留消息列表与输入栏。
1131→
1132→---
1133→
1134→## 私信未读数与社区红点提示
1135→
1136→**目的**
1137→- 当有人给我发私信时，社区页左上角信封图标能出现红点提示未读。
1138→- 打开会话后能正确清空未读，避免红点长期不消失。
1139→
1140→**入口**
1141→- 社区页：`PawHome/miniprogram/pages/community/index`
1142→- 消息页（私信列表）：`PawHome/miniprogram/pages/messages/index`
1143→- 聊天页（会话已读）：`PawHome/miniprogram/pages/chat/index`
1144→- 后端会话列表：`GET /im/conversations`
1145→- 后端标记已读：`POST /im/conversations/<conversation_id>/read`
1146→
1147→**数据流/状态**
1148→- 后端新增会话已读状态表：`IMConversationRead(conversation_id, user_id, last_read_at)`
1149→- 会话列表返回 `unreadCount`：
1150→  - 统计该用户在该会话中 `created_at > last_read_at` 且 `sender_id != user_id` 的消息条数
1151→- 前端红点来源：
1152→  - 社区页聚合 `notifications/unread-summary.total + 私信会话 unreadCount 总和`，大于 0 则显示红点
1153→
1154→**关键分支**
1155→- 进入聊天页/轮询收到对端新消息：调用 `markConversationRead(conversationId)` 写入 `last_read_at`，从而清空未读。
1156→- 社区页可见时启用轻量轮询刷新红点（默认 15s），避免停留在社区页时红点不更新。
1157→
1158→**边界条件**
1159→- 服务端尚未建表：启动后端时执行 `db.create_all()` 自动补齐缺失表（不影响已有数据）。
1160→
1161→**相关文件**
1162→- 小程序：
1163→  - `PawHome/miniprogram/pages/community/index.ts`
1164→  - `PawHome/miniprogram/services/im.ts`
1165→  - `PawHome/miniprogram/pages/chat/index.ts`
1166→- 后端：
1167→  - `backend/app/models.py`
1168→  - `backend/app/api/v1/im.py`
1169→  - `backend/run.py`
1170→
1171→### 变更 2026-03-29：不自动建表（避免改动真实数据库）
1172→
1173→**目的**
1174→- 避免后端启动时对真实数据库执行任何自动建表写入。
1175→
1176→**实现要点**
1177→- 移除 `backend/run.py` 中的 `db.create_all()`；数据库结构变更改为手动执行初始化脚本或迁移流程。
1178→
1179→---
1180→
1181→## 帖子可见性（全部可见/仅关注可见/仅自己可见）
1182→
1183→**目的**
1184→- 让发帖时设置的可见性真实生效：仅自己可见的帖子不应被其他用户在列表/主页/搜索/详情中看到。
1185→
1186→**可见性规则**
1187→- `public`：所有登录用户可见。
1188→- `followers`：仅作者本人 + 关注作者的用户可见。
1189→- `private`：仅作者本人可见。
1190→
1191→**入口**
1192→- 列表：`GET /posts`
1193→- 用户主页帖子列表：`GET /users/<user_id>/posts`
1194→- 详情：`GET /posts/<post_id>`
1195→- 首页/社区投送：`GET /feeds/community`
1196→- 搜索：`GET /search/posts`
1197→
1198→**实现要点**
1199→- 后端读取侧统一过滤：
1200→  - 始终允许作者本人看到自己的所有帖子
1201→  - 其他用户只能看到 `public`，以及在已关注作者时看到 `followers`
1202→  - `private`（及未知 visibility 值）对非作者不可见
1203→- 交互接口（点赞/收藏/分享等）在读取帖子时同样做可见性校验，避免通过已知 id 绕过。
1204→
1205→**相关文件**
1206→- 后端：
1207→  - `backend/app/api/v1/posts.py`
1208→  - `backend/app/api/v1/feeds.py`
1209→  - `backend/app/api/v1/search.py`
1210→
1211→#### 回退 2026-03-29：恢复聊天页空态文案
1212→
1213→**说明**
1214→- 仍保留 `scrollTop` 方案用于稳定滚动，但恢复空会话时的居中提示文案。
1215→
1216→---
1217→
1218→## 社区搜索页（与商店搜索区分，主页与社区共用）
1219→
1220→**目的**
1221→- 商店搜索只搜商品；社区搜索只搜帖子内容。
1222→- 主页与社区入口共用同一套社区搜索页，保证体验一致。
1223→
1224→**入口**
1225→- 小程序搜索页：`PawHome/miniprogram/pages/search/index`
1226→  - 社区搜索：`/pages/search/index?type=community`
1227→  - 商店搜索：`/pages/search/index?type=shop`
1228→- 后端搜索接口：
1229→  - 社区：`GET /search/posts`
1230→  - 商店：`GET /search/products`
1231→
1232→**数据流/状态**
1233→- 搜索类型：由路由参数 `type` 决定（`community`/`shop`）。
1234→- 搜索历史：按类型分开存储到本地缓存：
1235→  - `search_history_community`
1236→  - `search_history_shop`
1237→- 社区搜索支持：
1238→  - 分类：仅输出 `type=all|cat|dog`（其他分类先映射为 `all`）
1239→  - 排序：`sort=hot|latest`
1240→  - 分页：`page/pageSize` 上拉追加加载
1241→
1242→**关键分支**
1243→- 新关键词/切换分类/切换排序：重置 `page=1`、清空结果并重新请求。
1244→- 触底加载：`hasMore && !loading` 时 `page+1` 追加请求。
1245→- 点击结果：
1246→  - 社区：进入帖子详情 `/pages/post-detail/index?id=...`
1247→  - 商店：进入商品详情 `/pages/shop/detail?id=...`
1248→
1249→**边界条件**
1250→- 后端对社区搜索返回结果继续遵循帖子可见性规则（public/followers/private），避免私密帖子被搜索到。
1251→
1252→**相关文件**
1253→- 小程序：
1254→  - `PawHome/miniprogram/pages/search/index.ts`
1255→  - `PawHome/miniprogram/pages/search/index.wxml`
1256→  - `PawHome/miniprogram/services/search.ts`
1257→- 后端：
1258→  - `backend/app/api/v1/search.py`
1259→
1260→### 变更 2026-03-29：搜索结果封面补齐（视频 coverUrl / 图片首图）
1261→
1262→**问题现象**
1263→- 社区搜索结果列表中帖子封面为空，显示为灰色占位块。
1264→
1265→**根因**
1266→- `GET /search/posts` 仅支持 `media_json` 为数组时取首图；当帖子为视频（`{"type":"video","coverUrl":...}`）或对象结构（`{"images":[...]}`）时，封面解析返回空字符串。
1267→
1268→**修复方案**
1269→- 后端搜索接口解析 `media_json`：
1270→  - 数组：取第 1 张图
1271→  - 视频对象：取 `coverUrl`
1272→  - 图片对象：取 `images[0]`
1273→- 前端搜索页对空 `image` 增加占位图兜底，避免布局塌陷。
1274→
1275→### 变更 2026-03-29：搜索无封面使用默认图（推送3.jpg）
1276→
1277→**需求**
1278→- 社区搜索结果的帖子若无封面图，统一使用 `backend/instance/uploads/推送3.jpg` 作为默认封面。
1279→
1280→**实现要点**
1281→- 后端 `GET /search/posts` 当解析不到任何封面时返回默认封面 URL：`/media/推送3.jpg`（自动 URL 编码）。
1282→
1283→### 变更 2026-03-29：模糊搜索（同音错字/去空格/用品泛词）
1284→
1285→**目的**
1286→- 让用户输入存在空格、同音错字或泛词时仍能搜到目标内容，例如：`猫砂` 可通过 `猫莎/猫啥/猫 砂/猫咪用品` 等输入匹配到。
1287→
1288→**实现要点**
1289→- 后端新增宠物词库与查询扩展：
1290→  - 输入归一化：保留中文/字母/数字，去空格与符号
1291→  - 同音近字：针对 `砂` 的常见误写（`沙/莎/啥`）做归一化与扩展
1292→  - 用品泛词：当查询包含 `猫+用品` / `狗+用品` / `宠物+用品` 时，扩展为一组常用用品关键词（如猫砂、猫粮、猫砂盆、牵引绳等）
1293→  - 扩展数量限制：帖子最多 40 个 term、商品最多 60 个 term，避免 SQL 过长
1294→- 搜索接口应用：
1295→  - `GET /search/posts`：对 `Post.content` 做 OR contains
1296→  - `GET /search/products`：对 `ShopProduct.title/description` 做 OR contains
1297→
1298→### 变更 2026-03-29：扩充宠物词库（猫狗用品）
1299→
1300→**目标**
1301→- 将 `宠物用品/猫咪用品/狗狗用品` 这类“泛词”扩展为更细的可命中商品关键词（例如：`逗猫棒/猫条/猫砂/胸背/拾便袋/伊丽莎白圈` 等），即使商品标题里不写“宠物玩具/猫咪用品”也能搜到。
1302→
1303→**实现要点**
1304→- 扩充 `backend/app/search_lexicon.py`：
1305→  - 新增常见猫狗用品的同义词/别名（清洁、喂养、出行、护理、医疗等）
1306→  - 用品 bundle 补齐更多细项，并在扩展逻辑中对“用品类泛词”降低别名扩展优先级，优先扩展到具体商品词
1307→
1308→**相关文件**
1309→- 后端：
1310→  - `backend/app/search_lexicon.py`
1311→  - `backend/app/api/v1/search.py`
1312→
1313→### 变更 2026-03-29：搜索匿名访问、商品拼音匹配与前端实时搜索缓存
1314→
1315→**目的**
1316→- 未登录也能进行商品/社区搜索（仅返回公开内容），降低使用门槛。
1317→- 商品搜索支持拼音首字母与全拼输入（例如 `ms/maosha` 命中“猫砂”类商品）。
1318→- 搜索输入改为实时触发（防抖），并增加本地结果缓存与关键词高亮。
1319→
1320→**实现要点**
1321→- 后端：
1322→  - 搜索接口改为可选登录态：未登录时帖子仅返回 `visibility=public`。
1323→  - 商品表增加 `title_pinyin/title_initials` 两个可检索字段，并在写入时自动填充。
1324→- 小程序：
1325→  - 输入框 `bindinput` 实时触发搜索，400ms 防抖，避免频繁请求。
1326→  - 搜索结果按关键词+筛选维度缓存到本地（24h 过期 + LRU 淘汰），缓存命中先展示再后台刷新。
1327→  - 标题/摘要支持关键词高亮展示，并展示搜索建议/自动补全列表。
1328→
1329→**相关文件**
1330→- 后端：
1331→  - `backend/app/auth.py`
1332→  - `backend/app/api/v1/search.py`
1333→  - `backend/app/pinyin.py`
1334→  - `backend/app/pinyin_dict.json`
1335→  - `backend/app/models.py`
1336→  - `backend/scripts/migrate_add_shop_product_pinyin.py`
1337→  - `backend/tests/test_search_anonymous_pinyin.py`
1338→  - `backend/tests/test_pinyin.py`
1339→- 小程序：
1340→  - `PawHome/miniprogram/pages/search/index.ts`
1341→  - `PawHome/miniprogram/pages/search/index.wxml`
1342→  - `PawHome/miniprogram/pages/search/index.wxss`
1343→  - `PawHome/miniprogram/utils/searchCache.ts`
1344→  - `PawHome/miniprogram/utils/debounce.ts`
1345→  - `PawHome/miniprogram/utils/searchCache.test.ts`
1346→  - `PawHome/miniprogram/utils/debounce.test.ts`
1347→
1348→### 变更 2026-03-29：可选 SQLite FTS5 全文索引（自动降级）
1349→
1350→**目的**
1351→- 在数据量增大时提升搜索性能：优先走 SQLite FTS5 虚拟表进行全文匹配，并在未启用 FTS 时自动降级到原有 `contains/LIKE` 查询。
1352→
1353→**实现要点**
1354→- 后端增加 FTS 检索实现：
1355→  - 若库中存在 `posts_fts / shop_products_fts`，搜索接口优先用 FTS 取当前页命中的 `id` 列表与 `total`。
1356→  - 若 FTS 未创建或 `q` 为空，则走原有 ORM 模糊匹配逻辑。
1357→- 提供迁移脚本在存量数据库上创建虚拟表与触发器，并执行 `rebuild` 回填索引。
1358→
1359→**相关文件**
1360→- 后端：
1361→  - `backend/app/search_fts.py`
1362→  - `backend/app/api/v1/search.py`
1363→  - `backend/scripts/migrate_add_search_fts.py`
1364→
1365→### 变更 2026-03-29：自动补齐 shop_products 拼音字段（修复旧库 500）
1366→
1367→**问题现象**
1368→- 旧的 `instance/app.db` 中 `shop_products` 表缺少 `title_pinyin/title_initials` 字段，导致任何读取商品列表的接口（如 `/api/v1/shop/products`）在 ORM 查询时触发 500。
1369→
1370→**修复方案**
1371→- 应用启动时自动检测并补齐缺失字段，回填存量数据，并创建索引，保证旧库可无感升级。
1372→
1373→**相关文件**
1374→- `backend/app/schema_ensure.py`
1375→- `backend/app/__init__.py`
1376→
1377→---
1378→
1379→## 统一服务预约（疫苗/医疗/美容/寄养）
1380→
1381→**目的**
1382→- 为主页金刚区的四大服务（疫苗、医疗、美容、寄养）提供统一的预约表单与成功页，避免开发多套冗余页面。
1383→
1384→**入口**
1385→- 小程序主页金刚区点击对应图标：`PawHome/miniprogram/pages/service/index?type=vaccine|medical|beauty|foster`
1386→
1387→**数据流/状态**
1388→- 前端通过 `type` 参数动态初始化页面标题与可选项文案（如：疫苗显示“选择医院/选择疫苗”，寄养显示“选择门店/寄养房型”）。
1389→- `pages/service/index` 收集：所选宠物、服务项目、门店、日期、时间。
1390→- 确认预约后通过 URL 传参跳转到 `pages/service/success/index`，并在成功页展示汇总信息与提示。
1391→
1392→**相关文件**
1393→- `PawHome/miniprogram/pages/service/index.ts`
1394→- `PawHome/miniprogram/pages/service/index.wxml`
1395→- `PawHome/miniprogram/pages/service/index.wxss`
1396→- `PawHome/miniprogram/pages/service/success/index.*`
1397→
1398→---
1399→
1400→## 竖视频播放留白背景白底
1401→
1402→**目的**
1403→- 竖视频在帖子详情页按 `contain` 展示时，会出现左右留白；将留白背景从黑色改为白色，提升观感一致性。
1404→
1405→**入口**
1406→- 小程序帖子详情页：`PawHome/miniprogram/pages/post-detail/index`
1407→
1408→**实现要点**
1409→- `<video>` 使用标准属性 `object-fit="contain"`。
1410→- 视频节点与容器使用 `background-color` 显式设置为白色（避免默认黑底）。
1411→
1412→**相关文件**
1413→- `PawHome/miniprogram/pages/post-detail/index.wxml`
1414→- `PawHome/miniprogram/pages/post-detail/index.wxss`
1415→
1416→---
1417→
1418→## 疫苗预约页底部确认按钮布局
1419→
1420→**目的**
1421→- 避免疫苗预约页的“确认预约”按钮固定悬浮在页面底部时遮挡医院列表、时间选择和费用明细，保证内容可完整滚动查看。
1422→
1423→**入口**
1424→- 小程序疫苗预约页：`PawHome/miniprogram/pages/vaccine/appointment/index`
1425→
1426→**数据流/状态**
1427→- 页面内容仍按“宠物 / 疫苗 / 医院 / 时间 / 备注 / 费用明细”顺序渲染。
1428→- “确认预约”按钮改为页面内容流中的底部区域，跟随页面一起滚动到最下方展示。
1429→- 底部区域继续保留安全区内边距，避免按钮贴到系统手势区域。
1430→
1431→**关键分支**
1432→- 结构上新增 `page-footer` 包裹底部按钮，替代原来的单独安全区占位节点。
1433→- 样式上移除按钮的 `position: fixed`，改为常规块级布局，并保留整行宽度与原有视觉样式。
1434→
1435→**边界条件**
1436→- 小屏幕或开发者工具模拟高度较小时，页面底部内容不再被悬浮按钮压住。
1437→- 带底部安全区的设备仍会为按钮预留额外内边距，避免误触或被系统区域遮挡。
1438→
1439→**相关文件**
1440→- `PawHome/miniprogram/pages/vaccine/appointment/index.wxml`
1441→- `PawHome/miniprogram/pages/vaccine/appointment/index.wxss`
1442→- `PawHome/miniprogram/utils/vaccineAppointmentLayout.test.ts`
1443→
1444→---
1445→
1446→## 四类宠物服务后端接通
1447→
1448→**目的**
1449→- 将疫苗、美容、医疗、寄养四类宠物服务从页面内 mock 数据改为真实后端数据驱动，完成服务选项查询、可预约时间查询、预约创建与数据库落库闭环。
1450→
1451→**入口**
1452→- 小程序首页四类服务入口：`PawHome/miniprogram/pages/home/index`
1453→- 通用服务预约页：`PawHome/miniprogram/pages/service/index`
1454→- 疫苗预约页：`PawHome/miniprogram/pages/vaccine/appointment/index`
1455→
1456→**数据流/状态**
1457→- 后端新增服务机构、服务项目、服务时段三层业务数据，并扩展预约单表以保存机构、项目、时段、价格和快照信息。
1458→- 应用启动时会自动建表、补齐旧预约表新字段，并在服务基础数据为空时写入四类服务的默认种子数据。
1459→- 前端进入预约页后先拉取宠物列表，再按服务类型拉机构列表、机构下服务项目、项目可预约日期与时段。
1460→- 用户提交预约时，前端携带 `petId / providerId / offeringId / slotId / appointmentAt` 调用后端创建预约；后端校验归属关系、服务类型匹配和时段余量后落库。
1461→- 预约成功后前端使用后端返回的预约摘要跳转成功页展示。
1462→
1463→**关键分支**
1464→- 通用服务页负责美容、医疗、寄养三类服务；疫苗预约页保留独立布局，但复用同一套后端服务接口。
1465→- 后端兼容旧版通用预约创建方式，同时支持新版完整业务字段。
1466→- 取消预约时，如果预约绑定了时段，会同步回退该时段的已预约数量。
1467→
1468→**边界条件**
1469→- 老数据库没有新表时，启动过程会自动 `create_all` 创建服务机构、项目与时段表。
1470→- 老数据库已有 `service_appointments` 但缺少新字段时，会通过 schema ensure 自动补列与补索引。
1471→- 某个时段余量用尽时，后端会拒绝创建预约并返回冲突错误。
1472→- 当前种子数据用于首阶段真实联调，不包含支付、医生级排班和地图真实距离计算。
1473→
1474→**相关文件**
1475→- `backend/app/models.py`
1476→- `backend/app/schema_ensure.py`
1477→- `backend/app/__init__.py`
1478→- `backend/app/api/v1/services.py`
1479→- `backend/tests/conftest.py`
1480→- `backend/tests/test_services_appointments.py`
1481→- `backend/tests/test_service_catalog_flow.py`
1482→- `PawHome/miniprogram/services/petServices.ts`
1483→- `PawHome/miniprogram/pages/service/index.ts`
1484→- `PawHome/miniprogram/pages/service/index.wxml`
1485→- `PawHome/miniprogram/pages/vaccine/appointment/index.ts`
1486→- `PawHome/miniprogram/pages/vaccine/appointment/index.wxml`
1487→- `PawHome/miniprogram/utils/serviceBooking.ts`
1488→- `PawHome/miniprogram/utils/serviceBooking.test.ts`
1489→
### 变更 2026-03-31：预约日期选项解析与“今天/明天/后天”修复

**问题现象**
- 在预约时间选择弹窗/日期 tab 中，日期显示可能比真实日期少一天（例如 3/31 显示为 3/30），导致“今天/明天/后天”标签错乱。

**根因**
- `availableDates` 可能包含 ISO/带时区的日期字符串（如 `2026-03-31T00:00:00Z`），旧实现对非严格 `YYYY-MM-DD` 走 `new Date(value)` 解析，在不同运行环境下会发生时区换算导致日期回退。
- 天数差用毫秒差除以 86400000，在夏令时等场景可能出现非整天，从而误判 today/tomorrow。

**修复方案**
- 日期解析仅取“日期部分”（兼容 `YYYY-MM-DD`、`YYYY/MM/DD` 及后续带时间的字符串），统一用 `new Date(y, m-1, d)` 构造“本地当天 00:00”，避免引擎/时区差异。
- “今天/明天/后天”计算改为按本地年月日转成 `Date.UTC(y,m,d)` 的日级时间戳再做天数差，规避夏令时导致的 23/25 小时问题。

**相关文件**
- `PawHome/miniprogram/utils/serviceBooking.ts`
- `PawHome/miniprogram/utils/serviceBooking.test.ts`

1490→---
1491→
1492→## 疫苗模块真实数据链路（宠物/记录/驱虫/预约→提醒）
1493→
1494→**目的**
1495→- 将疫苗模块从页面内 mock 升级为真实后端数据驱动：宠物信息、疫苗/驱虫记录查询、预约后生成并维护提醒、记录页按宠物条件展示待接种提醒。
1496→
1497→**入口**
1498→- 疫苗记录页：`/pages/vaccine/record/index`
1499→- 疫苗预约页：`/pages/vaccine/appointment/index`
1500→- 提醒设置页：`/pages/vaccine/reminder/index?appointmentId=...`
1501→
1502→**数据流/状态**
1503→- 宠物信息：
1504→  - 统一通过 `GET /api/v1/users/me/pets` 拉取宠物列表。
1505→  - 记录页将 `currentPet` 写入 `data`（不使用 getter），保证 WXML 可稳定绑定头像/名字/简介。
1506→- 疫苗记录（核心/选择性）：
1507→  - 记录页按 `petId + category` 调用 `GET /api/v1/vaccines/status`，后端用 `vaccine_catalog + vaccine_records` 聚合得到每个疫苗的“已完成/未接种”状态与最近一次接种时间。
1508→- 驱虫记录：
1509→  - 记录页“驱虫记录”Tab 调用 `GET /api/v1/deworming/records?petId=...` 返回按时间倒序的记录列表。
1510→- 预约→提醒：
1511→  - 预约页创建预约成功后跳转提醒设置页，并携带 `appointmentId` 与预约摘要参数。
1512→  - 提醒页进入时先查询 `GET /api/v1/vaccines/reminders/by-appointment`；若不存在则用默认配置调用 `POST /api/v1/vaccines/reminders` 自动创建提醒，再展示并允许用户修改（提前天数/渠道/备注/是否加入日历）。
1513→- 待接种提醒卡片：
1514→  - 记录页进入/切换宠物时调用 `GET /api/v1/vaccines/reminders/upcoming?petId=...`，仅当存在未来提醒时展示卡片；为空则隐藏。
1515→
1516→**关键分支**
1517→- 记录页宠物切换：更新 `petIndex/currentPet` 后同时刷新「疫苗状态/驱虫记录/待接种提醒」。
1518→- 提醒页无 `appointmentId`：不创建提醒，仅允许作为入口页展示（保存时提示缺少预约信息）。
1519→
1520→**边界条件**
1521→- 为降低开发者工具 TypeScript 编译/缓存导致的 `wx://not-found` 风险，预约页提供可直接运行的 `index.js` 兜底入口。
1522→- 预约页跳转提醒页时，若 URL 已包含 `appointmentId`，需要将 success query 以 `&` 形式拼接，避免出现双 `?` 导致参数解析异常。
1523→
1524→**相关文件**
1525→- 小程序：
1526→  - `PawHome/miniprogram/pages/vaccine/record/index.(ts|js|wxml)`
1527→  - `PawHome/miniprogram/pages/vaccine/appointment/index.(ts|js)`
1528→  - `PawHome/miniprogram/pages/vaccine/reminder/index.(ts|js|wxml)`
1529→  - `PawHome/miniprogram/services/vaccines.ts`
1530→  - `PawHome/miniprogram/services/user.ts`
1531→- 后端：
1532→  - `backend/app/api/v1/vaccines.py`
1533→  - `backend/app/api/v1/users.py`
1534→  - `backend/app/models.py`
1535→  - `backend/tests/test_vaccine_module.py`
1536→
1537→---
1538→
1539→## 数据库脚本防误删护栏（init_db/smoke）
1540→
1541→**目的**
1542→- 避免在本地开发/联调时误执行脚本导致清空 `backend/instance/app.db`（用户真实数据丢失）。
1543→
1544→**入口**
1545→- 初始化脚本：`backend/scripts/init_db.py`
1546→- 冒烟脚本：`backend/scripts/smoke_api.py`
1547→
1548→**实现要点**
1549→- `init_db.py`：仅执行 `db.create_all()`，用于“补齐缺失表/结构”，不再包含任何 `drop_all` 重置逻辑。
1550→- `smoke_api.py`：固定使用系统临时目录下的独立 SQLite 文件作为测试库；脚本内部允许 `drop_all/create_all` 仅影响该临时库，不会触及开发库。
1551→
1552→**边界条件**
1553→- 如果需要“清空重建数据库”，必须由开发者显式手动执行对应操作，默认脚本不提供一键重置以降低误触风险。
1554→
1555→**相关文件**
1556→- `backend/scripts/init_db.py`
1557→- `backend/scripts/smoke_api.py`
1558→
1559→---
1560→
1561→## 疫苗医院封面图（/media 图片入库并在预约页展示）
1562→
1563→**目的**
1564→- 将宠物医院照片存入数据库的 `service_providers.cover_image`，并在小程序疫苗预约页的“医院列表卡片”中展示真实封面图。
1565→
1566→**入口**
1567→- 后端：`GET /api/v1/services/providers?serviceType=vaccine`
1568→- 小程序：`/pages/vaccine/appointment/index`
1569→
1570→**数据流/状态**
1571→- 图片文件放置于后端实例目录：`backend/instance/uploads/宠物医院1.jpg`、`backend/instance/uploads/宠物医院2.jpg`
1572→- 后端通过 `/media/<filename>` 提供静态访问；数据库存储的 `cover_image` 采用 `/media/<urlencoded filename>` 相对路径。
1573→- 小程序请求 providers 后，将返回的 `coverImage` 做 URL 归一化：
1574→  - `/assets/...` 维持小程序包内路径
1575→  - `/media/...` 拼接为 `http(s)://<origin>/media/...` 再用于 `<image src>`
1576→
1577→**关键分支**
1578→- 入库更新为增量方式：仅当对应 provider 的 `cover_image` 为空或仍为占位图时才写入，避免覆盖用户已配置的图片。
1579→
1580→**相关文件**
1581→- 后端：
1582→  - `backend/app/schema_ensure.py`
1583→  - `backend/app/api/v1/services.py`
1584→- 小程序：
1585→  - `PawHome/miniprogram/pages/vaccine/appointment/index.(ts|js|wxml|wxss)`
1586→
1587→### 变更 2026-03-30：预约页假地图与脉冲标记联动
1588→
1589→**目的**
1590→- 预约页“选择医院”区域不接真实地图也能有地图感与交互：展示可点击的医院点位，并在切换医院时触发高亮与平移动效。
1591→
1592→**实现要点**
1593→- 假地图：使用一张静态背景图作为地图底图，叠加医院点位 marker（百分比坐标定位）。
1594→- marker 交互：
1595→  - 点击 marker 触发同一套 `selectHospital` 逻辑，更新 `selectedHospitalId` 并刷新疫苗列表。
1596→  - 选中 marker 使用圆点 + 脉冲圈动画强调当前选择。
1597→- 镜头跟随：根据选中医院点位计算 `mapOffsetX/mapOffsetY`，对地图图层做小幅 translate，形成“镜头跟随”效果。
1598→
1599→**边界条件**
1600→- 点位坐标以 providerId 做预置映射；未知医院使用稳定的 fallback 坐标，保证不会重叠到不可见区域。
1601→
1602→### 变更 2026-03-30：假地图底图改为地图风格（CSS 生成）
1603→
1604→**目的**
1605→- 将原广告占位图替换为更“像地图”的底图效果，不依赖真实地图组件与定位权限。
1606→
1607→**实现要点**
1608→- 将地图底图改为纯 CSS 多层渐变（绿地块 + 道路带 + 轻网格），并继续叠加 marker 做交互。
1609→
1610→### 变更 2026-03-30：升级为真 map 组件（演示用）
1611→
1612→**目的**
1613→- 演示场景下使用小程序原生 `<map>` 组件提供真实地图底图效果，同时保留医院点位交互与动效。
1614→
1615→**实现要点**
1616→- 地图容器使用 `<map>`，并用 `cover-view` 叠加圆点脉冲 marker（避免依赖自定义 marker 图片资源）。
1617→- 交互仍复用 `selectHospital`：点击地图上的 marker 或列表选择医院，都会更新选中状态并触发后续疫苗数据刷新。
1618→
1619→**边界条件**
1620→- 地图交互（拖拽/缩放）默认关闭，保证演示时 marker 覆盖层位置稳定。
1621→
1622→### 变更 2026-03-30：真地图切换医院“拉远-平移-拉近”电影级动效
1623→
1624→**目的**
1625→- 切换选中的医院时，不希望生硬地切换坐标，而是模拟真实地图“先缩小视野、平移中心、再放大视野”的视觉效果。
1626→
1627→**实现要点**
1628→- 废弃 `cover-view` 的相对偏移定位，改为使用 `<map>` 的 `markers` 属性，并将 `customCallout` 作为 marker 展示容器，使其严格绑定真实的 `latitude/longitude` 坐标。
1629→- 点击不同医院时触发三步动画序列（通过 `setTimeout` 调度）：
1630→  1. 缩小 `mapScale`（如到 10），视野拉远。
1631→  2. 延时 400ms 后，更新 `mapLat/mapLng` 到新医院中心，平移镜头。
1632→  3. 再延时 400ms 后，恢复 `mapScale` 到 12（拉近），并同时更新脉冲标记的 `active` 状态。
1633→
1634→**相关文件**
1635→- `PawHome/miniprogram/pages/vaccine/appointment/index.(ts|js|wxml|wxss)`
1636→
1637→---
1638→
1639→## 接种提醒页预约信息解码
1640→
1641→**目的**
1642→- 修复接种提醒页预约摘要展示乱码（`%E6...`、`10%3A00`），保证中文与时间正常显示。
1643→
1644→**入口**
1645→- 提醒设置页：`/pages/vaccine/reminder/index?appointmentId=...&petName=...&itemName=...&storeName=...&date=...&time=...`
1646→
1647→**数据流/状态**
1648→- 跳转端拼接 query 时对摘要参数做 URL 编码；提醒页 `onLoad` 读取 `options` 后先解码，再写入页面 `data` 用于渲染。
1649→
1650→**关键分支**
1651→- 参数缺失或解码失败：保持原值，不影响页面渲染与保存提醒。
1652→
1653→**边界条件**
1654→- `appointmentId` 不做解码，避免影响按预约 ID 查询提醒的稳定性。
1655→
1656→**相关文件**
1657→- `PawHome/miniprogram/pages/vaccine/reminder/index.ts`
1658→- `PawHome/miniprogram/pages/vaccine/reminder/index.js`
1659→- `PawHome/miniprogram/utils/serviceBooking.ts`

---

## 疫苗预约记录（查看记录/详情/过期/删除）

**目的**
- 预约接种后提供统一入口查看“预约记录”，并支持从待接种提醒直达对应预约详情。
- 提醒到点后不提前消失：提醒与预约按“预约时间是否已过”自动过期。
- 历史预约记录默认保留，用户可手动删除。

**入口**
- 疫苗主页底部按钮：`查看记录` → `/pages/vaccine/appointments/index`
- 待接种提醒卡片：点击进入 `/pages/vaccine/appointments/detail/index?appointmentId=...`
- 预约详情页：`接种提醒` → `/pages/vaccine/reminder/index?appointmentId=...`

**数据流/状态**
- 列表页按宠物筛选预约：`GET /services/appointments?serviceType=vaccine&status=all&petId=...`
  - 前端将 `appointmentAt < now` 的记录归入“历史”，其余归入“未过期”。
- 预约详情页读取预约信息：`GET /services/appointments/:id`
- 删除预约记录：`POST /services/appointments/:id/delete`
  - 预约记录状态置为 `deleted`（列表默认不返回 deleted）
  - 若存在对应疫苗提醒，则同时将提醒置为 `inactive`，避免后续继续展示
- 待接种提醒展示逻辑：`GET /vaccines/reminders/upcoming?petId=...`
  - 后端按 `appointmentAt >= now` 返回最近一条未过期提醒（而不是按 `remindAt`），保证提醒在“接种前”持续可见，过了预约时间自动消失。

**关键分支**
- 无预约/无提醒：列表显示空态；主页不展示待接种提醒卡片。
- 删除后访问详情：后端返回 not found，前端提示加载失败并返回。

**边界条件**
- 预约记录“过期”不写回数据库，仅按 `appointmentAt` 与当前时间在前端做分组展示。
- 删除预约记录会释放时段占用（reservedCount 递减），避免占用无效库存。

**相关文件**
- 小程序：
  - `PawHome/miniprogram/pages/vaccine/record/index.(ts|wxml|wxss)`
  - `PawHome/miniprogram/pages/vaccine/appointments/index.(ts|js|wxml|wxss|json)`
  - `PawHome/miniprogram/pages/vaccine/appointments/detail/index.(ts|js|wxml|wxss|json)`
  - `PawHome/miniprogram/services/petServices.ts`
- 后端：
  - `backend/app/api/v1/services.py`
  - `backend/app/api/v1/vaccines.py`

---

## 服务门店封面图（美容/医疗/寄养）

**目的**
- 将美容/医疗/寄养的门店封面替换为真实图片，展示效果与疫苗预约页一致。

**入口**
- 服务预约页：`/pages/service/index?type=beauty|medical|foster`

**数据流/状态**
- 后端启动时对 `ServiceProvider.cover_image` 做增量补齐：当 `cover_image` 为空或仍为占位图时，按 providerId 映射到 `/media/<filename>`。
- 前端服务预约页展示门店列表时渲染 `coverImage`，并将相对路径转为绝对 URL 供 `<image>` 使用。

**边界条件**
- 仅对占位图做替换，不覆盖已配置封面。

**相关文件**
- `backend/app/schema_ensure.py`
- `PawHome/miniprogram/pages/service/index.(ts|wxml|wxss)`

---

## 服务预约页地图交互（美容/医疗/寄养）

**目的**
- 美容/医疗/寄养预约页的“选择门店/医院”区域使用原生 `<map>` 展示真实地图底图，并提供与疫苗预约页一致的点位交互与切换动效。

**入口**
- 服务预约页：`/pages/service/index?type=beauty|medical|foster`

**数据流/状态**
- 门店列表来自 `GET /services/providers?serviceType=...`。
- 页面根据 providerId 生成演示用坐标点位，构建 `markers` 并渲染 `<map>`：
  - 点击点位或列表切换门店：更新 `selectedStoreId/selectedStore`，并触发“拉远 → 平移 → 拉近”动画序列（通过 `setTimeout` 调度）。
  - `cover-view slot="callout"` 绘制圆点脉冲 marker，使用 `marker-id="{{id - 0}}"` 确保 markerId 为 number。

**边界条件**
- 当前 provider 数据未提供真实经纬度，页面使用同城（杭州周边）预置坐标用于演示；后续可升级为后端下发真实坐标。

### 变更 2026-03-31 预置坐标优化

- 将门店/医院的演示坐标调整到杭州主城区道路附近，避免 marker 落在河道/山里导致底图观感异常。

**相关文件**
- `PawHome/miniprogram/pages/service/index.ts`
- `PawHome/miniprogram/pages/service/index.wxml`
- `PawHome/miniprogram/pages/service/index.wxss`

---

## 服务预约体验修复（弹窗样式/日期/成功页/预约记录）

**目的**
- 统一美容/医疗/寄养/疫苗的预约体验：底部预约弹窗改为白底、日期展示正确、成功页展示真实宠物头像与正确返回路径，并提供预约记录查看入口。

**入口**
- 服务预约页：`/pages/service/index?type=vaccine|beauty|medical|foster`
- 服务预约成功页：`/pages/service/success/index?...`
- 服务预约记录页：`/pages/service/appointments/index?type=beauty|medical|foster`

**数据流/状态**
- 日期选项：由 `buildServiceDateOptions(availableDates)` 生成；为避免小程序 Date 解析差异导致“今天/明天”错位，改用 `new Date(y, m-1, d)` 解析 `YYYY-MM-DD`。
- 成功页展示：
  - 通过 query 传入 `petId/appointmentId`（并对参数统一解码），成功页使用 `GET /api/v1/users/me/pets` 匹配宠物并展示真实头像。
  - “返回XX页”根据服务类型跳回对应预约页（vaccine 跳回疫苗主页）。
  - 增加“查看记录”入口：vaccine 进入疫苗预约记录，其余类型进入服务预约记录。
- 服务预约记录：
  - 新增服务预约记录列表/详情页，按 `serviceType + petId` 拉取预约并按 `appointmentAt` 分组为“未过期/历史”。

**边界条件**
- 底部弹窗仅调整样式（白底 + 分割线），不改变原有交互逻辑。

**相关文件**
- `PawHome/miniprogram/pages/service/index.wxss`
- `PawHome/miniprogram/pages/service/index.ts`
- `PawHome/miniprogram/pages/service/success/index.(ts|wxml)`
- `PawHome/miniprogram/pages/service/appointments/index.(ts|wxml|wxss|json)`
- `PawHome/miniprogram/pages/service/appointments/detail/index.(ts|wxml|wxss|json)`
- `PawHome/miniprogram/utils/serviceBooking.ts`

---

## 页面路由切换动效（paw-route 统一）

**目的**
- 让非 Tab 页在进入/返回时具备统一的淡入 + 轻位移动效，减少“硬切”与闪动，整体更丝滑。

**入口**
- 任何 `navigateTo` 进入的页面（非 tabBar 页面）。
- 典型：服务预约、疫苗预约、商品详情、购物车、下单页、搜索页、设置页等。

**数据流/状态**
- 页面三态（注入到每个 Page 实例）：
  - `pageVisible`：进入动效的可见态
  - `pageLeaving`：离场态（供“带过渡导航”使用）
- `app.ts` 在 `Page()` 注册时统一包一层：
  - `onLoad` 调用 `initPageTransition(this)` 让页面初始不可见
  - `onReady` 调用 `enterPageTransition(this)` 在下一帧置为可见触发过渡
  - `onShow` 调用 `reenterPageIfNeeded(this)` 兼容“返回上一页时重放进入”场景
- WXML 根节点统一绑定：
  - `class="... paw-route {{pageVisible?'is-visible':''}} {{pageLeaving?'is-leaving':''}}"`

**关键分支**
- “带过渡导航”场景（页面离场动画）：
  - 使用 `navigateToWithTransitionOptions` / `navigateBackWithTransition` 等封装，在执行路由前先把当前页置为 `pageLeaving=true` 并延时跳转。

**边界条件**
- Tab 页（home/community/shop/my）不做离场动效；仅保持现有轻量进入表现，避免影响 tab 切换手感。
- 个别页面根节点若未绑定 `paw-route` class，只会享受“状态注入”，不会有视觉动效。

**相关文件**
- `PawHome/miniprogram/app.ts`
- `PawHome/miniprogram/utils/transition.ts`
- `PawHome/miniprogram/app.wxss`
- `PawHome/miniprogram/pages/service/index.wxml`
- `PawHome/miniprogram/pages/vaccine/appointment/index.wxml`
- `PawHome/miniprogram/pages/shop/detail.wxml`
- `PawHome/miniprogram/pages/cart/index.wxml`
- `PawHome/miniprogram/pages/search/index.wxml`

### 变更 2026-03-31：多层返回白屏兜底复位

**问题现象**
- 页面跳转层级较深时（如 社区 → 帖子 → 个人主页），点击返回回到上一层页面出现空白，但再返回到更上一层又正常。

**根因**
- `navigateToWithTransition*` 会在离场前把“当前页”置为 `pageVisible=false`（使其 `paw-route` 变为不可见）。
- 若返回动作不是通过 `navigateBackWithTransition*`（例如系统左上角返回/手势返回/直接 `wx.navigateBack()`），不会写入 re-enter 标记，上一页 `onShow` 不会触发复位，从而持续不可见表现为白屏。

**修复方案**
- 在 `reenterPageIfNeeded` 内增加兜底：当页面处于 `pageMounted=true` 且 `pageVisible=false`（或 `pageLeaving=true`）时，即使没有 re-enter 标记也强制执行 `enterPageTransition` 复位可见性，覆盖系统返回与手势返回路径。

**相关文件**
- `PawHome/miniprogram/utils/transition.ts`

---

## 底部弹窗 Sheet 动效（挂载/显隐分离）

**目的**
- 让底部弹窗（Sheet）打开/关闭都有过渡动画：遮罩淡入、面板从底部滑入；关闭时先滑出再卸载，避免“突然消失”。

**入口**
- 服务预约页“选择时间”弹窗。
- 客服聊天页“发订单给客服”底部选择订单弹窗。

**数据流/状态**
- 两个状态控制：
  - `showXxxSheet`：控制节点是否挂载（`wx:if`）
  - `xxxSheetVisible`：控制 `.show` class，触发 CSS transition
- 打开：先 `show=true` 挂载，再短延时 `visible=true` 触发进入动画。
- 关闭：先 `visible=false` 触发退场动画，再延时 `show=false` 卸载。

**边界条件**
- 弹窗内容较长时保留 `max-height` 与 `overflow-y: auto`，避免动画期间出现抖动。

**相关文件**
- `PawHome/miniprogram/pages/service/index.(ts|wxml|wxss)`
- `PawHome/miniprogram/pages/shop/customer-service-chat/index.(ts|wxml|wxss)`

---

## 社区媒体 URL 归一化（真机可访问）

**目的**
- 解决真机调试时社区帖子图片/视频封面打不开的问题（常见于历史数据写入了 `127.0.0.1/localhost` 的绝对 URL）。

**入口**
- 社区列表拉取：`GET /api/v1/posts`
- 帖子详情拉取：`GET /api/v1/posts/<id>`
- 发帖上传：`POST /api/v1/uploads`

**数据流/状态**
- 后端上传接口返回媒体 URL 时，可能基于请求的 `Host` 生成绝对地址；若在电脑本地用 `127.0.0.1` 访问过上传接口，历史帖子可能持久化了 `http://127.0.0.1:5001/media/...`。
- 小程序端在拉取帖子列表/详情时，对媒体字段做归一化：
  - 相对路径（如 `/media/...`）会补齐为 `http(s)://<API_HOST>/media/...`
  - 绝对路径但 host 为 `127.0.0.1/localhost/0.0.0.0` 的，会替换为当前 `getBaseUrl()` 推导出的 `origin`，确保真机可访问。

**关键分支**
- 为避免改动后端存量数据，采用前端兼容方式：渲染前统一改写 URL。
- 上传返回的 `data.url` 也做同样归一化，确保新发帖不受本地 host 影响。

**相关文件**
- `PawHome/miniprogram/services/posts.ts`
- `PawHome/miniprogram/services/upload.ts`
- `PawHome/miniprogram/config/env.ts`

### 变更 2026-03-31：归一化与缓存下沉到 resolveImageSrc，并覆盖全模块头像/缩略图

**问题现象**
- 真机调试下，部分页面仍存在图片不显示：如服务门店封面、订单商品图、消息页头像/缩略图、关注粉丝头像、部分帖子视频封面等。

**根因**
- 归一化逻辑仅在少数模块（如 posts/upload）局部实现；其它模块的图片字段未统一处理，可能直接使用：
  - 相对路径（`/media/...` 或 `media/...`）
  - 旧数据写入的 `localhost/127.0.0.1/0.0.0.0` 绝对地址
- `resolveImageSrc` 原本仅作为 “http 下载缓存” 使用，且对 `/media/...` 这类相对路径会旁路返回，导致 poster/头像字段渲染时仍可能保留不可访问 URL。

**修复方案**
- 在 `resolveImageSrc` 内统一做“先归一化、再缓存下载”：
  - `/media/...`、`media/...` → 自动补全为当前 `getBaseUrl()` 推导的 `origin`
  - `localhost/127.0.0.1/0.0.0.0` → 自动改写为 `origin`
  - 同源下载时自动携带 `Authorization: Bearer <token>`（兼容受保护媒体）
- 在服务层对关键列表接口返回的头像/缩略图字段补齐 hydrate：
  - 服务门店封面、订单商品图、私信会话头像、通知头像/缩略图、“我评论的”头像/缩略图、关注粉丝头像等。

**相关文件**
- `PawHome/miniprogram/utils/mediaCache.ts`
- `PawHome/miniprogram/services/petServices.ts`
- `PawHome/miniprogram/services/shop.ts`
- `PawHome/miniprogram/services/im.ts`
- `PawHome/miniprogram/services/notifications.ts`
- `PawHome/miniprogram/services/comments.ts`
- `PawHome/miniprogram/services/user.ts`

### 变更 2026-03-31：宠物头像入库与首页视频封面展示修复

**问题现象**
- 宠物头像在真机下不稳定显示，且编辑宠物资料后头像可能彻底丢失。
- 首页热门推送中，视频帖封面长期显示为默认兜底图，而图片帖正常。
- 商城/首页广告位在真机可能显示旧图或不更新。

**根因**
- 宠物新增/编辑页把 `wx.chooseMedia` 的本地临时路径直接写入数据库，跨设备/清缓存后必然失效；且“详情读取”已将头像 hydrate 为 `wxfile://` 本地缓存路径，继续提交会把缓存路径反写入库。
- 后端 `/feeds/community` 只解析 `media_json` 为数组首图，不识别视频对象的 `coverUrl`，导致 `imageUrl` 为空，从而触发首页兜底图。
- `resolveImageSrc` 的本地缓存以 URL 为 key；当后端资源文件替换但 URL 不变时，真机会一直使用旧缓存。

**修复方案**
- 宠物新增/编辑页提交前若头像为本地路径（`wxfile://`/磁盘路径），先调用上传接口换取后端可访问 URL 再入库；编辑页读取宠物信息改为拿“原始数据”并单独生成展示用头像，避免把 hydrate 后的 `wxfile://` 反写入库。
- 后端 `/feeds/community` 支持解析 `media_json` 为对象时的 `coverUrl`（无 cover 时再尝试 `images[0]`），使视频帖封面能被首页正确取到。
- 商城页与首页广告图在非 release 环境拼接时间戳参数，避免本地缓存旧图影响联调。

**相关文件**
- `PawHome/miniprogram/pages/my/settings/pets/add/index.ts`
- `PawHome/miniprogram/utils/mediaCache.ts`
- `backend/app/api/v1/feeds.py`
- `PawHome/miniprogram/pages/home/index.ts`
- `PawHome/miniprogram/pages/shop/index.ts`

---

## 小程序请求 HTTPS 协议降级（开发环境兜底）

**目的**
- 修复小程序端请求出现 `net::ERR_SSL_PROTOCOL_ERROR` 的问题（典型场景：把仅支持 HTTP 的本地/内网服务地址误写成 HTTPS）。
- 让网络错误日志携带请求 URL，便于直接定位到底请求到了哪个地址。

**入口**
- 所有通过 `services/request.ts` 的 `request()` 发起的接口请求（包括登录、拉取列表、上传等）。

**数据流/状态**
- `request()` 统一拼出最终 URL（`getBaseUrl() + path` 或直接使用绝对 URL）。
- 网络失败时把 `url` 透传进归一化错误对象 `RequestError.url`，并随 `NETWORK_ERROR/HTTP_ERROR/API_ERROR` 输出。

**关键分支**
- 当首次请求满足以下条件时触发一次性重试：
  - URL 为 `https://...`
  - 错误信息包含 `ERR_SSL_PROTOCOL_ERROR` 或 `ssl`
  - 当前不是 `release` 环境
  - hostname 属于私有网段或 `localhost`
- 重试逻辑：将 `https://` 替换为 `http://` 后重发一次相同请求；若仍失败则按网络错误返回。

**边界条件**
- `release` 环境永不自动降级，避免把线上 HTTPS 请求误降级为 HTTP。
- 非私有域名不自动降级，避免对公网服务产生意外行为。

**相关文件**
- `PawHome/miniprogram/services/request.ts`
- `PawHome/miniprogram/config/env.ts`
