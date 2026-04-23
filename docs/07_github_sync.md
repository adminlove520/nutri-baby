# GitHub 图床同步功能设计文档

## 1. 功能概述

GitHub 图床同步功能允许用户将 Nutri-Baby 中的宝宝相册照片自动同步到 GitHub 仓库，作为图床备份和存储解决方案。

### 1.1 核心特性

| 特性 | 说明 |
|------|------|
| **定时同步** | 随系统定时任务自动同步 |
| **同步策略** | 可选择同步哪些类型的相册 |
| **去重机制** | 智能检测已同步文件，避免重复上传 |
| **同步日志** | 记录每次同步的结果和错误 |

---

## 2. 数据模型

### 2.1 GitHubConfig（GitHub 配置表）

```prisma
model GitHubConfig {
  id           BigInt    @id @default(autoincrement())
  userId       BigInt    @unique @map("user_id")
  token        String    // GitHub Personal Access Token
  owner        String    // 仓库所有者
  repo         String    // 仓库名称
  branch       String    @default("main") // 分支
  basePath     String?   @map("base_path") // 存储基础路径
  autoSync     Boolean   @default(false) @map("auto_sync") // 自动同步开关
  syncInterval String    @default("daily") @map("sync_interval") // 同步频率
  syncGrowth   Boolean   @default(true) @map("sync_growth") // 同步成长记录
  syncMoment  Boolean   @default(true) @map("sync_moment") // 同步精彩瞬间
  syncVaccine  Boolean   @default(false) @map("sync_vaccine") // 同步疫苗记录
  keepLocal    Boolean   @default(true) @map("keep_local") // 保留本地副本
  lastSyncAt   DateTime? @map("last_sync_at") // 上次同步时间
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("github_config")
}
```

### 2.2 SyncLog（同步日志表）

```prisma
model SyncLog {
  id          BigInt    @id @default(autoincrement())
  userId      BigInt    @map("user_id")
  status      String    // success | failed | partial
  message     String    // 日志消息
  syncedCount Int       @default(0) @map("synced_count") // 成功同步数量
  errorLog    String?   @map("error_log") // 错误日志
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@map("sync_log")
}
```

---

## 3. 同步频率

| 值 | 说明 | 间隔 |
|------|------|------|
| `daily` | 每天 | 24 小时 |
| `weekly` | 每周 | 7 天 |
| `monthly` | 每月 | 30 天 |

---

## 4. API 接口

### 4.1 获取配置

```
GET /api/settings?action=get
```

**Response:**
```json
{
  "configured": true,
  "config": {
    "owner": "username",
    "repo": "nutri-baby-photos",
    "branch": "main",
    "basePath": "Photos/NutriBaby",
    "autoSync": true,
    "syncInterval": "daily",
    "syncGrowth": true,
    "syncMoment": true,
    "syncVaccine": false,
    "keepLocal": true,
    "lastSyncAt": "2026-04-24T10:00:00Z"
  }
}
```

### 4.2 保存配置

```
POST /api/settings?action=save
```

**Body:**
```json
{
  "token": "ghp_xxxxxx",
  "owner": "username",
  "repo": "nutri-baby-photos",
  "branch": "main",
  "basePath": "Photos/NutriBaby",
  "autoSync": true,
  "syncInterval": "daily",
  "syncGrowth": true,
  "syncMoment": true,
  "syncVaccine": false,
  "keepLocal": true
}
```

### 4.3 测试连接

```
POST /api/settings?action=test
```

**Body:**
```json
{
  "token": "ghp_xxxxxx",
  "owner": "username",
  "repo": "nutri-baby-photos"
}
```

**Response:**
```json
{
  "valid": true,
  "message": "已连接到 username/nutri-baby-photos"
}
```

### 4.4 立即同步

```
POST /api/settings?action=sync
```

**Response:**
```json
{
  "message": "同步完成",
  "syncedCount": 15,
  "errors": []
}
```

### 4.5 获取同步日志

```
GET /api/settings?action=logs
```

**Response:**
```json
[
  {
    "id": 1,
    "status": "success",
    "message": "定时同步完成，成功 15 个文件",
    "syncedCount": 15,
    "errorLog": null,
    "createdAt": "2026-04-24T10:00:00Z"
  }
]
```

---

## 5. GitHub 路径结构

同步到 GitHub 的文件按以下结构组织：

```
{basePath}/
├── 2026/
│   └── 2026-04-24_宝宝名/
│       ├── 成长记录/
│       │   └── {timestamp}_{nanoid}_{index}.jpg
│       └── 精彩瞬间/
│           └── {timestamp}_{nanoid}_{index}.jpg
```

**路径生成规则：**

```typescript
// 生成基础路径
function generateAlbumPath(albumType: string, babyName: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const typeName = albumType === 'growth' ? '成长记录' : '精彩瞬间';

  return `${year}/${year}-${month}-${day}_${babyName}/${typeName}`;
}

// 生成文件名
function generateFilename(originalName: string, index: number): string {
  const timestamp = Date.now();
  const nanoid = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop() || 'jpg';
  return `${timestamp}_${nanoid}_${String(index).padStart(3, '0')}.${ext}`;
}
```

---

## 6. 去重机制

为避免重复上传，采用了以下策略：

1. **内存去重**：使用 `Set` 记录已同步的文件路径
2. **GitHub API 检查**：上传前通过 `checkFileExists()` 检查文件是否已存在
3. **路径唯一性**：文件名包含时间戳和随机字符串，确保唯一性

```typescript
const syncedPaths = new Set<string>();

// 检查是否已同步
if (syncedPaths.has(filePath)) continue;

// 检查 GitHub 是否已存在
const exists = await uploader.checkFileExists(filePath);
if (exists) {
  syncedPaths.add(filePath);
  syncedCount++;
  continue;
}
```

---

## 7. 定时同步流程

定时同步集成在 `api/cron.ts` 中，每日凌晨执行：

```
定时任务触发
    ↓
遍历所有启用 autoSync 的用户
    ↓
检查距离上次同步是否超过间隔
    ↓
执行 syncUserAlbumsToGitHub()
    ↓
更新 lastSyncAt
    ↓
记录同步日志
```

---

## 8. 前端配置界面

入口：**系统设置** → **GitHub 图床同步**

**配置项：**

| 配置项 | 说明 |
|------|------|
| GitHub Token | Personal Access Token（需 repo 权限） |
| 仓库所有者 | GitHub 用户名 |
| 仓库名称 | 用于存储照片的仓库 |
| 分支 | 默认 main |
| 存储路径 | 可选，如 `Photos/NutriBaby` |

**同步设置：**

| 配置项 | 说明 |
|------|------|
| 自动同步 | 随定时任务自动同步 |
| 同步策略 | 选择同步哪些类型（成长记录/精彩瞬间/疫苗记录） |
| 同步频率 | 每天/每周/每月 |
| 保留本地副本 | 同步后保留原始图片链接 |

---

## 9. 安全性考虑

1. **Token 保护**：GitHub Token 存储在数据库中，传输使用 HTTPS
2. **权限最小化**：建议使用具有 `repo` 权限的 Personal Access Token
3. **不记录敏感信息**：同步日志不记录 Token 信息

---

## 10. 后续优化方向

1. **增量同步** - 仅同步新增或修改的文件
2. **并行上传** - 多线程/多进程加速大图床同步
3. **压缩上传** - 上传前自动压缩图片
4. **Webhook 通知** - 同步完成后发送通知
