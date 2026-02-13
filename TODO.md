# TODO - 待办功能

---

## 🔧 性能优化（Performance）

> 经代码审查发现的性能瓶颈，按优先级排列。

### Perf-1：添加数据库索引（零代码改动，立竿见影）

在微信云开发控制台 → 数据库 → 对应集合 → 索引管理中添加：

- [ ] `ratings` 集合：复合索引 `(dishId, userId, date)` — 几乎所有评分操作依赖
- [ ] `ratings` 集合：复合索引 `(userId, createdAt)` — 我的页面查询
- [ ] `admins` 集合：索引 `userId` — 每个管理操作都查
- [ ] `users` 集合：索引 `userId` — 登录和资料查询
- [ ] `dishes` 集合：复合索引 `(date, meal)` — 首页和分享页查询

### Perf-2：onShow 缓存 + 脏标记机制（收益最大）

> 当前 home、rank、my、weekly、admin 页面全部在 onShow 无条件重新加载数据，每次 tab 切换都触发云函数调用。

- [x] 新增 `utils/cache.js`：轻量缓存工具，支持 TTL（默认 30s）+ 全局脏标记
- [x] 改造 home 页面：onShow 检查缓存，未过期则跳过加载
- [x] 改造 rank 页面：同上
- [x] 改造 my 页面：同上
- [x] 改造 weekly 页面：同上
- [x] 改造 admin 页面：同上
- [x] 写操作（评分、删除、添加菜品）后设置脏标记，相关页面 onShow 看到脏标记才刷新
- [x] 下拉刷新始终强制加载

### Perf-3：weekly 页面改用聚合云函数（减少 5+ 次调用 → 1 次）

> 当前 `_fetchAllDishes` 递归分页拉取整周所有菜品完整数据，只为按日期/餐次计数。

- [ ] 新建云函数 `getWeeklyStats`：用聚合管道 `aggregate().match().group()` 直接返回每日每餐计数
- [ ] weekly 页面改为调用 `getWeeklyStats`，移除 `_fetchAllDishes`

### Perf-4：my 页面合并统计查询（3 次调用 → 1 次）

> 当前为获取"总评分数"、"评过的菜品数"、"本月评分数"发了 3 个独立数据库请求。

- [ ] 新建云函数 `getUserStats`：一次查询返回所有统计数据
- [ ] my 页面改为调用 `getUserStats`

### Perf-5：云函数查询优化

- [ ] `getDishRatings`：多个 dishId 改用 `_.in()` 并行查询，替代 for 循环串行
- [ ] `getDishRatings`：`indexOf()` 去重改为对象 key 去重（O(n²) → O(n)）
- [ ] `getDishRatings`：评论已冗余 nickName/avatarUrl，跳过多余的 users 表查询
- [ ] `submitRating`：改为先查后写（存在则 update，不存在则 add），避免 N+1 删除
- [ ] `login`：admin/user 存在性检查加 `.field({ _id: true })` 减少传输
- [ ] `deleteDish`：批量删除评分改用 `where().remove()` 替代循环单条删除

### Perf-6：前端细节优化

- [ ] rate 页面：提交评分/上传图片后用乐观更新替代 `loadData()` 全量刷新
- [ ] home 页面：三次 `filter()` 分餐次改为单次遍历分组
- [ ] dish-card 组件：图片加 `lazy-load` 属性实现懒加载
- [ ] rate 页面：`onCommentInput` 加防抖减少 setData 频率


## P4：单品分享卡片
- [ ] dish-card 组件增加分享按钮
- [ ] 评分完成后引导分享
- [ ] 分享文案根据分数区间差异化
- [ ] 分享路径带 `dishId` + `date`，落地到菜品详情页
- [ ] （二期）Canvas 海报 + 小程序码生成


## 其他功能增强
- [ ] 分享数据埋点
- [ ] 朋友圈分享：`onShareTimeline` 支持（仅 Android）

## 运营策略（无需开发）
- [ ] 拉 5-10 个种子用户先体验，积累初始内容
- [ ] 每周在公司群/食堂群发「本周最佳菜品 TOP3」排行榜截图引流
- [ ] 推广话术主打吐槽心理：「来给今天的菜打个分，看看是不是就你觉得难吃」
- [ ] 尝试与食堂管理员建立联系，形成「评价→改进」正向循环
