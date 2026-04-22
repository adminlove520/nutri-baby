# 2. 技术架构 (Architecture)

## 2.1 整体架构图
项目采用典型的前后端分离架构，但在部署层面利用了 Vercel 的单项目（Mono-project）能力：
-   **Frontend**: 静态资源托管在 Vercel Edge Network。
-   **Backend**: 动态 API 映射为独立运行的 Serverless Functions。
-   **Database**: 连接池化管理的 Vercel Postgres。

## 2.2 核心模块设计

### 2.2.1 统一 API 路由
后端 API 位于 `/api` 目录，利用文件路由系统：
-   `/api/auth/` - 用户认证（手机号/密码/JWT）。
-   `/api/baby/` - 宝宝档案管理及成员邀请。
-   `/api/record/` - 动态路由 `[type].ts` 处理不同类型的生长记录。
-   `/api/ai/` - 对接 MiniMax 进行数据脱敏与智能分析。

### 2.2.2 数据库模型 (Prisma)
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
