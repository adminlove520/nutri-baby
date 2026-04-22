# Nutri-Baby (育儿助手)

一个专为新手父母设计的育儿助手应用。基于 **Vue 3 + Node.js Serverless + Prisma + PostgreSQL** 架构，针对 **Vercel** 平台进行了深度优化，并集成了 **MiniMax-M2.7 AI** 模型提供智能育儿建议。

## 🌟 核心特性

-   **全方位的宝宝记录**: 涵盖喂养（母乳、奶瓶、辅食）、睡眠、排泄（尿布性状分析）和生长发育（身高、体重）。
-   **AI 智能助手**: 集成 **MiniMax M2.7** 模型，基于宝宝最近 7 天的记录提供个性化的健康分析和成长建议。
-   **家庭协作系统**: 支持生成 24 小时有效的邀请链接，允许多个家庭成员共同记录和关注宝宝成长。
-   **数据可视化**: 使用 **ECharts** 展示生长曲线、喂养量统计和睡眠规律，支持与 WHO/国家标准对比。
-   **Serverless 架构**: 后端基于 Vercel Functions，无需管理服务器，冷启动快，自动缩容。
-   **响应式设计**: 完美适配移动端（Web-First）和桌面端浏览器，具有温馨的 "BabyCare" 设计风格。

## 🏗️ 技术架构

-   **前端**: [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) + [Pinia](https://pinia.vuejs.org/) + [Element Plus](https://element-plus.org/)
-   **后端**: [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js)
-   **数据库**: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) + [Prisma ORM](https://www.prisma.io/)
-   **AI**: [MiniMax-M2.7](https://www.minimaxi.com/) (text_generation_v2)
-   **可视化**: [ECharts](https://echarts.apache.org/)

## 🚀 快速开始

### 1. 克隆项目与安装依赖

```bash
git clone https://github.com/adminlove520/nutri-baby.git
cd nutri-baby
npm install
cd frontend && npm install && cd ..
```

### 2. 环境配置

在根目录创建 `.env` 文件（参考 `.env.example`）：

```env
# 数据库连接 (Vercel Postgres)
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# 身份验证
JWT_SECRET="your-secret-key"

# MiniMax AI 配置
MINIMAX_API_KEY="your-minimax-api-key"
MINIMAX_GROUP_ID="your-minimax-group-id"
```

### 3. 数据库同步

```bash
npx prisma generate
npx prisma db push
```

### 4. 本地开发

```bash
npm run dev
```

访问 `http://localhost:3000` 即可开始。

## 📦 部署指南 (Vercel)

本项目已经过预配置，支持一键部署至 Vercel：

1.  将代码推送到 GitHub。
2.  在 Vercel 控制台导入项目。
3.  添加上述环境变量。
4.  Vercel 将自动运行 `npm run build` 并完成部署。

## 📄 文档索引

-   [项目简介](./docs/01_introduction.md)
-   [技术架构详解](./docs/02_architecture.md)
-   [开发手册](./docs/03_development.md)
-   [用户操作指南](./docs/04_user_manual.md)
-   [部署与维护](./docs/05_deployment.md)

## 🤝 贡献说明

欢迎提交 Pull Request 或 Issue。在开始之前，请阅读我们的[代码标准](./docs/标准/)。

---
*Created with ❤️ for better parenting.*
