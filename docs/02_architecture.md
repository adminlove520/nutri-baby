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
                                         +---- [MiniMax AI API] (Intelligence)
                                         |
                                         +---- [AMap API] (LBS)
```

## 🧩 核心层级说明

### 1. 前端层 (Vue 3 + Vite)
-   **状态管理**: 使用 Pinia 存储用户信息和当前选中的宝宝状态，实现跨页面持久化。
-   **组件化**: 高度复用的 `DailyTipsCard`, `AIInsightCard` 等业务组件。
-   **样式引擎**: 自定义 `theme.scss` 统一管理玻璃拟态（Glassmorphism）变量和深色模式映射。

### 2. 后端层 (Vercel Serverless)
-   **模块化 API**: 为了绕过 Vercel 免费版的功能数量限制，所有子接口被整合进 `/api/user.ts`, `/api/baby.ts`, `/api/record.ts` 等核心文件，通过 `action` 参数进行内部路由分发。
-   **Auth 机制**: 基于 JWT 的无状态认证，配合 `lib/auth.ts` 中间件实现权限校验。

### 3. 数据层 (Prisma + Postgres)
-   **连接池**: 集成 Prisma Accelerate，解决 Serverless 环境下频繁数据库连接导致的 500 错误。
-   **对象存储**: 利用 Vercel Blob 处理头像上传，通过 `api/upload.ts` 实现安全的权限管理。

### 4. AI 智能引擎 (MiniMax-M2.7)
-   **V2 协议适配**: 手写 `lib/ai/providers/minimax.ts` 适配最新的 MiniMax-M2.7 文本模型。
-   **JSON 强制约束**: 通过 `response_format: { type: 'json_object' }` 确保 AI 返回的数据能被后端直接解析，避免 Markdown 干扰导致的 JSON 解析失败。

### 5. 地图服务 (AMap)
-   **动态加载**: 前端根据需求异步加载高德地图 JS 库。
-   **POI 检索**: 基于浏览器 Geolocation 接口，调用高德 POI 检索周边的社区接种点。

## 🔒 安全性设计

-   **软删除**: 用户与宝宝数据采用 `deletedAt` 标记删除，支持注销后在 30 天内重新注册激活。
-   **字段级过滤**: `lib/utils.ts` 中的 `safeJSON` 函数会自动过滤掉密码等敏感字段。

---
*Next: [开发手册](./03_development.md)*
