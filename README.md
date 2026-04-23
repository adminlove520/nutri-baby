# Nutri-Baby (育儿助手)

一个专为新手父母设计的科学育儿助手应用。基于 **Vue 3 + Node.js Serverless + Prisma + PostgreSQL** 架构，针对 **Vercel** 平台进行了深度优化，并集成 **OpenAI (gpt-4o-mini)** 模型与 **高德地图 (AMap)** 提供智能化的育儿建议与生活服务。

## 🌟 核心特性

-   **高端视觉体验**: 全站采用 **Glassmorphism (玻璃拟态)** 设计风格，支持系统级 **深色模式 (Dark Mode)**，界面温馨且具有现代感。
-   **全方位的宝宝记录**: 涵盖喂养（母乳、奶瓶、辅食）、睡眠、排泄（状态卡片式记录）和生长发育（身高、体重曲线）。
-   **AI 智能助手**: 
    *   **深度健康洞察**: 基于宝宝的日常喂养、睡眠和医疗记录，利用 **GPT-4o-mini** 提供个性化的健康分析与育儿建议。
    *   **接种管家**: 自动生成未来 6 个月的国家免疫规划接种清单，并提供深度疫苗百科。
    *   **附近接种点**: 集成高德地图，实时定位并搜索最近的社区卫生服务中心，支持一键拉起导航。
-   **数据可视化**: 使用 **ECharts** 展示生长曲线，支持与 WHO 标准对比，数据状态实时洞察。
-   **安全与存储**: 
    *   **Vercel Blob**: 高效存储宝宝头像与媒体资源。
    *   **注销与找回**: 支持账号软注销（数据保留但访问封禁）及快速激活找回功能。
-   **性能优化**: 
    *   **边缘网络优化**: 针对 Vercel 部署节点进行延迟优化。
    *   **AI 响应加速**: 采用轻量化提示词与异步并发请求，确保分析结果秒级呈现。

## 🏗️ 技术架构

-   **前端**: [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) + [Pinia](https://pinia.vuejs.org/) + [Element Plus](https://element-plus.org/)
-   **后端**: [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js)
-   **数据库**: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) + [Prisma ORM](https://www.prisma.io/)
-   **AI**: [OpenAI](https://openai.com/) (支持 gpt-4o-mini / gpt-4o)
-   **地图服务**: [高德地图 AMap API](https://lbs.amap.com/)
-   **媒体存储**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)

## 🚀 快速开始

### 1. 克隆项目与安装依赖

```bash
git clone https://github.com/adminlove520/nutri-baby.git
cd nutri-baby
npm install
cd frontend && npm install && cd ..
```

### 2. 环境配置

在根目录创建 `.env` 文件：

```env
# 数据库连接
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# 身份验证
JWT_SECRET="your-secret-key"

# AI 配置 (推荐使用 OpenAI)
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"

# Vercel Blob 配置 (部署到 Vercel 后自动获取)
BLOB_READ_WRITE_TOKEN="your-token"

# 邮件服务
EMAIL_USER="your-qq-mail@qq.com"
EMAIL_PASS="your-smtp-auth-code"
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

## 📦 部署指南 (Vercel)

1.  将代码推送到 GitHub。
2.  在 Vercel 控制台导入项目。
3.  在 Vercel 项目设置中开启 **Postgres** 和 **Blob** 存储。
4.  添加环境变量 `OPENAI_API_KEY`、`AI_PROVIDER` 和 `JWT_SECRET`。
5.  部署完成后，即可通过生成的 URL 访问。

## 📄 文档索引

-   [项目简介](./docs/01_introduction.md)
-   [技术架构详解](./docs/02_architecture.md)
-   [开发手册](./docs/03_development.md)
-   [用户操作指南](./docs/04_user_manual.md)
-   [部署与维护](./docs/05_deployment.md)

---
*Created with ❤️ for better parenting.*
