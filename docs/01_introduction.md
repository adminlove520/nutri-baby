# 1. 项目介绍 (Introduction)

## 1.1 项目背景
Nutri-Baby 是一个现代化的母婴护理管理平台，旨在帮助家长轻松记录宝宝的喂养、睡眠、排泄和生长数据。

本项目经历了从 **Uni-app + Go** 到 **Vue 3 + Node.js Serverless** 的重大架构重构。重构的主要目标是：
-   **零运维成本**: 利用 Vercel Serverless 架构，摆脱传统的服务器管理。
-   **AI 赋能**: 集成 MiniMax M2.7 模型，将静态数据转化为有意义的育儿建议。
-   **极致体验**: 使用 Web 标准技术栈（Vite + Element Plus）提供更流畅的交互。

## 1.2 核心功能
*   **宝宝管理**: 多宝宝档案、头像上传、全家协作（通过 24 小时邀请链）。
*   **记录追踪**:
    *   **喂养**: 支持母乳、奶瓶、辅食，包含量和持续时间。
    *   **睡眠**: 自动计算时长，分析睡眠规律。
    *   **排泄**: 详细记录尿布状态（干、湿、便、两者），支持性状和颜色分析。
    *   **生长**: 身高、体重、头围追踪。
*   **AI 智能分析**: 首页健康分析卡片，基于最近记录自动评估宝宝健康状态并给出建议。
*   **数据统计**: 专业的 ECharts 图表展示生长发育趋势和喂养量规律。

## 1.3 技术栈
*   **前端**: Vue 3 (Composition API), TypeScript, Vite, Element Plus, Pinia.
*   **后端**: Node.js (Vercel Functions), Prisma ORM.
*   **数据库**: PostgreSQL (Vercel Postgres / Neon).
*   **AI**: MiniMax M2.7 (MiniMax-M2.7-text-generation-v2).
*   **监控/部署**: Vercel.
