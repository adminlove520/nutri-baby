# 05. 部署与维护

Nutri-Baby 专为 Vercel 自动化部署设计。通过简单的配置，您可以拥有一套完全属于自己的育儿助手。

## 📦 Vercel 部署步骤

### 1. 仓库准备
将本项目代码上传至您的 GitHub 个人私有或公开仓库。

### 2. 创建 Vercel 项目
在 Vercel 控制台点击 **"Add New"** -> **"Project"**，选择您的仓库并导入。

### 3. 存储资源配置
-   **Postgres**: 进入项目的 "Storage" 标签页，创建一个 **Vercel Postgres** 数据库并连接。
-   **Blob**: 同样在 "Storage" 中，创建一个 **Vercel Blob** 存储桶，并将其 **Access Level** 修改为 **Public**（用于展示头像）。

### 4. 环境变量
在 "Settings" -> "Environment Variables" 中添加以下关键变量：

| 变量名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `JWT_SECRET` | 是 | 用于 JWT 签名的随机长字符串 |
| `AI_PROVIDER` | 否 | 模型提供商：`openai` (推荐) 或 `minimax` |
| `OPENAI_API_KEY` | 否 | 使用 OpenAI 时的 API Key |
| `AI_MODEL` | 否 | 指定模型，如 `gpt-4o-mini` 或 `MiniMax-M2.7` |
| `MINIMAX_API_KEY` | 否 | 使用 MiniMax 时的 API Key |
| `VITE_AMAP_KEY` | 是 | 高德地图 Web端 (JS API) 的 API Key |
| `VITE_AMAP_SECURITY_CODE` | 是 | 高德地图安全密钥 |
| `EMAIL_USER` | 否 | QQ 邮箱账号（用于提醒） |
| `EMAIL_PASS` | 否 | QQ 邮箱 SMTP 授权码 |

### 5. 高德地图配置

1. 访问 [高德地图开放平台](https://lbs.amap.com/) 注册开发者账号
2. 进入 [控制台](https://console.amap.com/dev/key/app) 创建应用
3. 添加 **Web端 (JS API)** 类型的 Key
4. 复制生成的 **API Key** 和 **安全密钥 (Security Code)**
5. 将这两个值分别配置到 Vercel 环境变量 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE`

> **注意**: JS API 类型 Key 只能用于前端地图加载，不可用于后端 REST API 调用。

### 6. 自动化构建
Vercel 会自动读取 `vercel.json` 并执行构建。默认构建命令已包含 Prisma 同步逻辑。

## 🛠️ 日常维护

### 数据库迁移
如果您修改了 `prisma/schema.prisma`，请在本地运行：
```bash
npx prisma generate
npx prisma db push
```
然后将代码推送至 GitHub，Vercel 会自动更新线上数据库结构。

### Cron 任务
本项目预设了每日 08:00 (UTC+8) 触发 AI 建议生成。您可以在 Vercel 项目的 **"Cron Jobs"** 面板中看到 `/api/cron/reminders` 的配置情况。

---
*Back to [首页](../README.md)*
