# 02. 技术架构详解

Nutri-Baby 采用了轻量化、现代化的云原生架构，特别针对 Vercel 平台的 Hobby Plan 进行了资源优化和功能适配。

## 🏗️ 整体架构图

```text
[浏览器/移动端] <---- HTTPS ----> [Vercel Edge Network]
      |                                  |
      |                            [Vercel Functions] (Node.js API)
      |                                  |
      +---- [Vercel Blob] (Images)       +---- [Prisma ORM]
                                         |        |
                                         |    [Prisma Accelerate] (Pooling)
                                         |        |
                                         |    [Vercel Postgres] (DB)
                                         |
                                         +---- [OpenAI / MiniMax API] (AI)
                                         |
                                         +---- [GitHub API] (图床同步)
                                         |
                                         +---- [AMap API] (LBS)
```

## 🧩 核心层级说明

### 1. 前端层 (Vue 3 + Vite)
- **状态管理**: 使用 Pinia 存储用户信息和当前选中的宝宝状态，实现跨页面持久化。
- **组件化**: 高度复用的 `DailyTipsCard`, `AIInsightCard` 等业务组件。
- **样式引擎**: 自定义 `theme.scss` 统一管理玻璃拟态（Glassmorphism）变量和深色模式映射。
- **路由管理**: Vue Router 实现页面导航和权限控制。
- **PWA 支持**: Service Worker 实现离线访问。

### 2. 后端层 (Vercel Serverless)
- **模块化 API**: 所有子接口被整合进 `/api/user.ts`, `/api/baby.ts`, `/api/record.ts`, `/api/settings.ts` 等核心文件，通过 `action` 参数进行内部路由分发。
- **Auth 机制**: 基于 JWT 的无状态认证，配合 `lib/auth.ts` 中间件实现权限校验。
- **GitHub 同步**: `lib/github.ts` 实现 GitHub REST API 封装。
- **定时任务**: `api/cron.ts` 处理疫苗提醒和 GitHub 同步。

### 3. 数据层 (Prisma + Postgres)
- **连接池**: 集成 Prisma Accelerate，解决 Serverless 环境下频繁数据库连接导致的 500 错误。
- **对象存储**: 利用 Vercel Blob 处理头像和相册上传，通过 `api/upload.ts` 实现安全的权限管理。
- **软删除**: 所有数据采用 `deletedAt` 标记删除，支持数据恢复。

### 4. AI 智能引擎 (多提供商支持)
- **工厂模式**: 基于 `lib/ai/factory.ts` 实现多模型切换。
- **OpenAI 适配**: 首选 **GPT-4o-mini**，在 Vercel 美国节点下具备极低的延迟与极高的推理质量。
- **MiniMax 适配**: 针对国内用户优化的 **MiniMax-M2.7** 模型。
- **JSON 强制约束**: 通过 `response_format: { type: 'json_object' }` 确保 AI 返回的数据能被后端直接解析。

### 5. GitHub 图床同步
- **上传服务**: `GitHubUploader` 类封装了文件上传、检查、文件夹创建等操作。
- **路径生成**: 按日期/宝宝/类型自动生成文件夹结构。
- **去重机制**: 结合 Set 和 GitHub API 检查，避免重复上传。
- **定时同步**: 集成到 cron 任务，自动按设定频率执行。

### 6. 地图服务 (AMap)
- **动态加载**: 前端根据需求异步加载高德地图 JS 库。
- **三级搜索策略**: 采用多级降级搜索策略，依次查找医院、诊所卫生院、妇产/综合医院。
- **POI检索**: 基于浏览器 Geolocation 接口，调用高德 POI 检索周边的医疗服务点。

## 🔒 安全性设计

- **软删除**: 用户与宝宝数据采用 `deletedAt` 标记删除，支持注销后在 30 天内重新注册激活。
- **字段级过滤**: `lib/utils.ts` 中的 `safeJSON` 函数会自动过滤掉密码等敏感字段。
- **JWT 认证**: 所有 API 请求都需要携带有效的 JWT token。
- **GitHub Token 保护**: Token 仅在需要时使用，不记录在日志中。

## 📊 数据库模型关系

```
User
├── Baby (1:N)
│   ├── BabyAlbum (1:N)
│   │   ├── AlbumComment (1:N)
│   │   └── AlbumLike (1:N)
│   ├── BabyVaccineSchedule (1:N)
│   └── BabyCollaborator (1:N)
├── FeedingRecord (1:N)
├── SleepRecord (1:N)
├── DiaperRecord (1:N)
├── GrowthRecord (1:N)
└── Notification (1:N)

User
└── GitHubConfig (1:1)
    └── SyncLog (1:N)
```

---

*Next: [开发手册](./03_development.md)*
