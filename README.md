# Nutri-Baby 育儿助手

![Version](https://img.shields.io/badge/version-2.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Vue](https://img.shields.io/badge/Vue-3-orange)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-brightgreen)

一款专为新手父母设计的智能育儿助手，帮助记录宝宝成长、疫苗接种、喂养睡眠等重要信息。

## 🌟 核心特性

### 👶 宝宝管理
- 多宝宝 profiles 支持，快速切换
- 家庭成员邀请与协作
- 宝宝档案管理（头像、昵称、出生日期）

### 📊 成长记录
- 身高、体重记录与追踪
- **ECharts 成长曲线**可视化
- WHO 标准对比分析
- 数据统计与趋势洞察

### 💉 疫苗管理
- 国家免疫规划疫苗清单
- 接种计划自动生成
- **AI 疫苗百科**深度科普
- **高德地图**附近接种点搜索
- 接种前邮件/站内提醒

### 📷 成长相册（朋友圈风格）
- 多图上传，网格瀑布流展示
- 照片评论与点赞互动
- 按时间轴展示成长历程
- 分类管理（成长记录/精彩瞬间）

### 🔄 GitHub 图床同步
- 配置 GitHub Token、仓库、分支
- **定时自动同步**到 GitHub 仓库
- **同步策略**可选择相册类型
- 同步去重与日志记录
- 按日期/宝宝自动创建文件夹结构

### 🤖 AI 智能助手
- **每日育儿锦囊**：科学育儿建议
- **健康洞察报告**：基于喂养睡眠数据的趋势分析
- 多 AI 提供商支持（OpenAI / MiniMax）

### 📱 用户体验
- **PWA 离线支持**：随时访问
- **深色模式**：护眼界面
- **响应式设计**：移动端与 PC 完美适配
- 玻璃拟态（Glassmorphism）温馨 UI

### 🔔 定时任务
- 每日凌晨自动扫描待接种疫苗
- 自动发送站内通知与邮件提醒
- AI 育儿锦囊自动生成

## 🏗️ 技术架构

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + Vite + Pinia + Element Plus |
| **后端** | Vercel Serverless Functions (Node.js) |
| **数据库** | PostgreSQL + Prisma ORM + Accelerate |
| **AI** | OpenAI (GPT-4o-mini) / MiniMax-M2.7 |
| **存储** | Vercel Blob + GitHub Gist |
| **地图** | 高德地图 AMap API |
| **邮件** | QQ Mail SMTP |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/adminlove520/nutri-baby.git
cd nutri-baby
```

### 2. 安装依赖

```bash
npm install
cd frontend && npm install && cd ..
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# 数据库连接
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# 身份验证
JWT_SECRET="your-secret-key"

# AI 配置
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="your-token"

# 邮件服务
EMAIL_USER="your-qq-mail@qq.com"
EMAIL_PASS="your-smtp-auth-code"
```

### 4. 数据库同步

```bash
npx prisma generate
npx prisma db push
```

### 5. 启动开发

```bash
npm run dev
```

## 📄 项目文档

| 文档 | 说明 |
|------|------|
| [项目简介](./docs/01_introduction.md) | 项目目标、核心亮点 |
| [技术架构](./docs/02_architecture.md) | 系统架构、AI 引擎设计 |
| [开发手册](./docs/03_development.md) | 开发规范、API 文档 |
| [用户指南](./docs/04_user_manual.md) | 功能操作说明 |
| [部署指南](./docs/05_deployment.md) | Vercel 部署与维护 |
| [相册功能](./docs/06_gallery_feature.md) | 成长相册设计详解 |
| [更新日志](./CHANGELOG.md) | 版本更新历史 |

## 📦 部署指南 (Vercel)

1. 将代码推送到 GitHub
2. 在 Vercel 控制台导入项目
3. 开启 **Postgres** 和 **Blob** 存储
4. 配置环境变量
5. 部署完成

详细部署文档请参考 [部署指南](./docs/05_deployment.md)

## 🔧 功能配置

### GitHub 同步配置

1. 在 **系统设置** → **GitHub 图床同步** 中配置：
   - GitHub Personal Access Token（需 repo 权限）
   - 仓库所有者 (Owner)
   - 仓库名称 (Repo)
   - 分支 (Branch)
   - 存储路径（可选）

2. 开启自动同步并设置频率：
   - 每天 / 每周 / 每月

3. 配置同步策略：
   - 成长记录
   - 精彩瞬间
   - 疫苗记录

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

Copyright (c) 2025-2026 Nutri-Baby Project

---

*Created with ❤️ for better parenting.*
