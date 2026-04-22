# 2. 技术架构 (Architecture)

## 2.1 整体架构图
项目采用典型的前后端分离架构，但在部署层面利用了 Vercel 的单项目（Mono-project）能力：
-   **Frontend**: 静态资源托管在 Vercel Edge Network。
-   **Backend**: 动态 API 映射为独立运行的 Serverless Functions。
-   **Database**: 连接池化管理的 Vercel Postgres。

## 2.2 核心模块设计

### 2.2.1 模块化 API 设计
后端 API 位于 `/api` 目录，针对 Vercel Hobby 限制进行了模块化整合（Consolidation）：
-   `/api/auth.ts` - 统一身份认证模块，支持手机号/邮箱双登录。
-   `/api/baby.ts` - 整合宝宝档案 CRUD、疫苗计划及成员邀请。
-   `/api/record.ts` - 统一处理 Feeding, Sleep, Diaper, Growth 四类记录。
-   `/api/user.ts` - 用户中心及统计数据聚合。
-   `/api/cron.ts` - 自动化任务，集成 Nodemailer 实现疫苗邮件推送。
-   `/api/ai.ts` - 对接 MiniMax 进行智能分析。

### 2.2.2 路由重写 (Vercel Rewrite)
为了保持前端 API 调用习惯不变，我们在 `vercel.json` 中配置了高级重写逻辑，将前端的各细分请求自动分发至上述模块：
-   `/api/auth/login` -> `/api/auth?action=login`
-   `/api/user/stats` -> `/api/user?action=stats`
-   `/api/record/:type` -> `/api/record?type=:type`

### 2.2.3 数据库模型 (Prisma)
使用 Prisma 保证类型安全：
-   `User` & `Baby`: 一对多关系，配合 `BabyCollaborator` 实现权限控制。
-   `Record` 模型: 分表存储 Feeding, Sleep, Diaper, Growth 以提升查询效率。
-   `Standard`: 内置 WHO 生长发育标准数据。

### 2.2.3 AI 集成方案
采用 `AIFactory` 设计模式，目前默认提供 `MinimaxProvider`：
1.  **Context 准备**: 后端自动检索宝宝最近 7 天的原始记录。
2.  **Prompt 工程**: 将数据转换为 AI 可读的结构化描述。
3.  **结果解析**: 将 AI 返回的建议渲染在前端 `AIInsightCard` 组件中。

## 2.3 部署环境
-   **Vercel.json**: 配置了复杂的重写规则，确保前端 `history` 路由与后端 `/api` 路由不冲突。
-   **Prisma Client**: 针对 Vercel RHEL 环境预配置了 `binaryTargets`。
