# 03. 开发手册

欢迎参与 Nutri-Baby 的开发！本手册将引导您了解本地开发环境的搭建、API 规范以及如何添加新功能。

## 🛠️ 环境依赖

-   **Node.js**: v18.0.0+
-   **Package Manager**: npm v9+
-   **Database**: PostgreSQL 14+ (或直接使用 Vercel Postgres)

## 🏁 本地运行步聚

1.  **安装工作区依赖**:
    ```bash
    npm install
    ```
2.  **配置 Prisma**:
    修改 `prisma/schema.prisma` 中的 `datasource` 并在 `.env` 中设置 `DATABASE_URL`。
3.  **生成 Prisma Client**:
    ```bash
    npx prisma generate
    ```
4.  **推送到本地/测试数据库**:
    ```bash
    npx prisma db push
    ```
5.  **启动开发模式**:
    ```bash
    npm run dev
    ```

## 📡 API 开发规范

### 1. 路由结构
Vercel Serverless Functions 位于 `/api` 目录。我们采用 **Action Pattern** 来整合功能：

```typescript
// api/user.ts 示例
export default async function handler(req, res) {
    const { action } = req.query;
    switch(action) {
        case 'info': return getInfo(req, res);
        case 'update': return updateProfile(req, res);
        default: return res.status(405).end();
    }
}
```

### 2. 身份认证
在 API 中使用 `getUserFromRequest` 获取当前登录用户：

```typescript
import { getUserFromRequest } from '../lib/auth';
const user = await getUserFromRequest(req);
if (!user) return res.status(401).json({ message: 'Unauthorized' });
```

### 3. 数据返回格式
推荐使用 `lib/utils.ts` 中的 `success` 和 `error` 函数：
-   `success(res, data)` -> 200 OK
-   `error(res, message, status)` -> 错误返回

## 🎨 前端组件开发

-   **图标库**: 使用 `@element-plus/icons-vue`。
-   **状态管理**: 通过 `stores/baby.ts` 获取当前活跃宝宝的 `id`。
-   **API 调用**: 使用预配置好的 `api/client.ts` (基于 Axios)，它会自动处理 JWT Token 的添加。

## 🧪 常用脚本

-   `npm run build`: 全量构建前端和 Prisma Client。
-   `npx prisma studio`: 可视化管理本地数据库数据。

---
*Next: [用户操作指南](./04_user_manual.md)*
