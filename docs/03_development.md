# 3. 开发手册 (Development)

## 3.1 快速环境准备
1.  **Node.js**: 推荐 v20+。
2.  **Vercel CLI**: `npm i -g vercel`。
3.  **Postgres**: 本地可以使用 Docker 运行 Postgres 或直接连接 Vercel Postgres 预览库。

## 3.2 项目结构
```text
/
├── api/            # Vercel Serverless Functions (后端)
├── frontend/       # Vue 3 Vite 项目 (前端)
├── lib/            # 后端共享库 (数据库客户端, AI 逻辑)
├── prisma/         # 数据库 Schema 与迁移文件
└── vercel.json     # Vercel 部署配置文件
```

## 3.3 开发规范
-   **API 开发**: 新增接口需在 `api/` 下创建 `.ts` 文件，引用 `lib/prisma.ts` 进行数据库操作。
-   **状态管理**: 前端持久化数据必须存储在 Pinia Store 中（`user.ts`, `baby.ts`, `record.ts`）。
-   **组件库**: 优先使用 Element Plus 提供的组件，自定义样式放在 `frontend/src/assets/theme.scss`。
-   **AI 调用**: 如需更换模型，仅需在 `lib/ai/providers/` 下实现 `AIProvider` 接口，并在 `AIFactory` 中切换。

## 3.4 常用命令
-   `npm install`: 安装根目录及工作区依赖。
-   `npm run dev`: 启动本地模拟环境（前端 + API）。
-   `npx prisma generate`: 修改 Schema 后必须运行。
-   `npx prisma db push`: 将 Schema 更改应用到数据库。
