# 成长相册功能设计文档

## 1. 功能概述

成长相册是 Nutri-Baby 的宝宝照片管理模块，提供宝宝图库和时光相册两大功能。

### 1.1 核心功能

| 功能 | 说明 |
|------|------|
| **宝宝图库** | 多图上传、照片管理（CRUD）、分类管理 |
| **时光相册** | 按时间轴展示宝宝成长照片 |

### 1.2 入口位置

- **个人中心** → 功能与服务 → 宝宝图库 / 时光相册
- **底部导航** → 成长 → 右上角相册入口（待实现）

---

## 2. 数据模型

### 2.1 Prisma Model: BabyAlbum

```prisma
model BabyAlbum {
  id          BigInt    @id @default(autoincrement())
  babyId      BigInt    @map("baby_id")
  userId      BigInt    @map("user_id")
  title       String?   // 照片标题
  description String?   // 照片描述
  url         String    // CDN URL
  filename    String    // 原始文件名
  fileSize    Int?      @map("file_size")
  mimeType    String?   // MIME类型
  width       Int?      // 图片宽度
  height      Int?      // 图片高度
  albumType   String    @default("growth") @map("album_type")
  time        DateTime? // 拍照时间
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // 软删除

  baby  Baby @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user  User @relation(fields: [userId], references: [id])

  @@index([babyId, createdAt])
  @@map("baby_album")
}
```

### 2.2 albumType 枚举值

| 值 | 说明 |
|----|------|
| `growth` | 成长记录 |
| `moment` | 精彩瞬间 |

---

## 3. API 接口

### 3.1 获取相册列表

```
GET /api/album
```

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| babyId | string | 是 | 宝宝ID |
| albumType | string | 否 | 照片类型 (growth/moment) |
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |

**Response:**
```json
{
  "records": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### 3.2 创建相册记录

```
POST /api/album
```

**Body:**
```json
{
  "babyId": "123",
  "title": "宝宝百天照",
  "description": "今天是宝宝百天纪念日",
  "url": "https://cdn.example.com/photo.jpg",
  "filename": "baby_100days.jpg",
  "fileSize": 1024000,
  "mimeType": "image/jpeg",
  "albumType": "growth",
  "time": "2024-01-15T10:30:00Z"
}
```

### 3.3 更新相册记录

```
PUT /api/album
```

**Body:**
```json
{
  "id": 123,
  "title": "更新后的标题",
  "description": "更新后的描述",
  "albumType": "moment"
}
```

### 3.4 删除相册记录

```
DELETE /api/album?id=123
```

**说明:** 执行软删除，设置 `deletedAt` 时间戳

---

## 4. 前端页面

### 4.1 宝宝图库 `/gallery`

**功能特性:**

1. **多图上传**
   - 支持点击选择或拖拽上传
   - 一次最多上传9张
   - 每张图片最大5MB
   - 自动压缩和优化

2. **照片管理**
   - 网格展示，适配移动端
   - 点击预览大图
   - 编辑照片信息（标题、描述、类型）
   - 删除照片（软删除）

3. **分类筛选**
   - 全部 / 成长记录 / 精彩瞬间

**组件结构:**

```
Gallery.vue
├── page-header (标题 + 分类筛选)
├── upload-section (上传区域)
│   ├── upload-card
│   │   └── upload-area (拖拽/点击上传)
│   └── upload-progress
├── gallery-grid (照片网格)
│   └── gallery-item
│       ├── photo (el-image)
│       ├── item-overlay (悬停操作按钮)
│       └── item-info (日期 + 标题)
└── edit-dialog (编辑弹窗)
```

### 4.2 时光相册 `/record/gallery`

**功能特性:**

1. **时间轴展示**
   - 按月份分组显示
   - 瀑布流/网格混合布局
   - 点击查看大图

2. **与成长记录关联**
   - 可关联到特定生长记录

---

## 5. 文件存储

### 5.1 存储策略

使用 Vercel Blob 或 S3 兼容存储：

```
宝宝ID/时间戳-原始文件名
例: 123/1705312200000-baby_100days.jpg
```

### 5.2 上传流程

1. 前端选择文件 → 2. 调用 `/api/upload?filename=xxx` → 3. 获取 CDN URL → 4. 调用 `/api/album` 保存元数据

---

## 6. 权限控制

| 操作 | 权限说明 |
|------|----------|
| 查看相册 | 宝宝家庭成员或协作者 |
| 上传照片 | 宝宝家庭成员或协作者 |
| 编辑/删除 | 上传者或宝宝所有者 |

---

## 7. 移动端适配

| 特性 | 实现 |
|------|------|
| 响应式网格 | `grid-template-columns: repeat(3, 1fr)` |
| 触摸预览 | el-image-viewer |
| 压缩上传 | 前端压缩至 5MB 以内 |

---

## 8. 后续优化方向

1. **人脸识别** - 自动按宝宝标记照片
2. **AI 分类** - 按场景/表情自动分类
3. **照片拼图** - 成长里程碑拼图分享
4. **成长视频** - 将照片串成成长视频
5. **数据导出** - 打包下载全部照片
