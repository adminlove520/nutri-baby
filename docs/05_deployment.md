# 5. 部署与维护 (Deployment)

## 5.1 Vercel 部署流程
1.  **关联仓库**: 在 Vercel Dashboard 关联此 GitHub 仓库。
2.  **环境变量**: 必须配置以下变量：
    - `POSTGRES_PRISMA_URL`
    - `POSTGRES_URL_NON_POOLING`
    - `JWT_SECRET`
    - `MINIMAX_API_KEY`
    - `MINIMAX_GROUP_ID`
3.  **构建设置**:
    - **Build Command**: `prisma generate && npm run build --workspace=frontend`
    - **Output Directory**: `frontend/dist`

## 5.2 数据库维护
-   **备份**: 建议使用 Vercel Postgres 提供的自动快照功能。
-   **迁移**: 生产环境建议使用 `npx prisma migrate deploy` 确保数据安全。

## 5.3 故障排查
-   **Function Timeout**: 检查数据库查询是否由于缺少索引（Index）导致缓慢。
-   **AI 调用失败**: 确认 MiniMax 余量及 API 权限设置。
-   **Build Error**: 确保 `typescript` 版本不低于 5.8，或检查 `tsconfig.json` 是否包含当前环境不支持的编译选项。
