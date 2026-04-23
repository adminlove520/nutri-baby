# 成长相册功能设计文档

## 1. 功能概述

成长相册是 Nutri-Baby 的宝宝照片管理模块，提供宝宝图库和时光相册两大功能，支持评论点赞互动，并可将相册同步到 GitHub 仓库。

### 1.1 核心功能

| 功能 | 说明 |
|------|------|
| **宝宝图库** | 多图上传、照片管理（CRUD）、分类管理 |
| **时光相册** | 按时间轴展示宝宝成长照片（朋友圈风格） |
| **评论点赞** | 照片评论、点赞、回复功能 |
| **分享功能** | 生成分享链接、AI 生成朋友圈文案 |
| **GitHub 同步** | 自动同步相册到 GitHub 仓库 |

### 1.2 入口位置

- **个人中心** → 功能与服务 → 宝宝图库 / 时光相册
- **底部导航** → 成长 → 右上角相册入口

---

## 2. 数据模型

### 2.1 BabyAlbum（相册主表）

```prisma
model BabyAlbum {
  id          BigInt    @id @default(autoincrement())
  babyId      BigInt    @map("baby_id")
  userId      BigInt    @map("user_id")
  title       String?   // 照片标题
  description String?   // 照片描述
  url         String    // CDN URL，多图用逗号分隔
  filename    String    // 原始文件名
  fileSize    Int?      @map("file_size")
  mimeType    String?   // MIME类型
  width       Int?      // 图片宽度
  height      Int?      // 图片高度
  albumType   String    @default("growth") @map("album_type")
  time        DateTime? // 拍照时间
  likesCount  Int       @default(0) @map("likes_count")
  commentsCount Int     @default(0) @map("comments_count")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // 软删除

  baby      Baby           @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user      User           @relation(fields: [userId], references: [id])
  comments  AlbumComment[]
  likes     AlbumLike[]

  @@index([babyId, createdAt])
  @@map("baby_album")
}
```

### 2.2 AlbumComment（评论表）

```prisma
model AlbumComment {
  id        BigInt   @id @default(autoincrement())
  albumId   BigInt   @map("album_id")
  userId    BigInt   @map("user_id")
  content   String   // 评论内容
  parentId  BigInt?  @map("parent_id") // 回复ID
  createdAt DateTime @default(now()) @map("created_at")

  album   BabyAlbum @relation(fields: [albumId], references: [id], onDelete: Cascade)
  user    User      @relation(fields: [userId], references: [id])
  parent  AlbumComment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies AlbumComment[] @relation("CommentReplies")

  @@map("album_comment")
}
```

### 2.3 AlbumLike（点赞表）

```prisma
model AlbumLike {
  id        BigInt   @id @default(autoincrement())
  albumId   BigInt   @map("album_id")
  userId    BigInt   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  album BabyAlbum @relation(fields: [albumId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId], references: [id])

  @@unique([albumId, userId])
  @@map("album_like")
}
```

### 2.4 albumType 枚举值

| 值 | 说明 |
|----|------|
| `growth` | 成长记录 |
| `moment` | 精彩瞬间 |

---

## 3. API 接口

### 3.1 获取相册列表

```
GET /api/album?babyId=123&albumType=growth&page=1&limit=20
```

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
  "albumType": "growth"
}
```

### 3.3 评论功能

```
POST /api/album?action=comment
```

**Body:**
```json
{
  "albumId": 123,
  "content": "太可爱了！",
  "parentId": null
}
```

### 3.4 点赞功能

```
POST /api/album?action=like
```

**Body:**
```json
{
  "albumId": 123
}
```

### 3.5 分享功能

```
POST /api/share
```

**Body:**
```json
{
  "albumId": 123,
  "type": "link" | "caption"
}
```

**Response:**
```json
{
  "shareUrl": "https://nutri-baby.com/share/abc123",
  "caption": "📸 宝宝的成长记录\n\n✨ 宝宝百天照\n\n记录于 2024-01-15\n\n🌟 分享自 Nutri-Baby 育儿助手"
}
```

### 3.6 GitHub 同步

```
POST /api/settings?action=sync
```

详见 [GitHub 同步功能](./07_github_sync.md)

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

### 4.2 时光相册 `/record/gallery`

**功能特性:**

1. **朋友圈风格展示**
   - 按月份分组显示
   - 瀑布流/网格混合布局
   - 点击查看大图

2. **评论点赞**
   - 点赞动画效果
   - 评论输入框
   - 回复功能

3. **分享功能**
   - 复制分享链接
   - AI 生成朋友圈文案

---

## 5. 文件存储

### 5.1 存储策略

使用 Vercel Blob 或 S3 兼容存储：

```
宝宝ID/时间戳-原始文件名
例: 123/1705312200000-baby_100days.jpg
```

### 5.2 GitHub 同步路径结构

```
basePath/
├── 2024/
│   └── 2024-01-15_宝宝名/
│       ├── 成长记录/
│       │   └── 1705312200000_abc123_001.jpg
│       └── 精彩瞬间/
│           └── 1705312200001_def456_001.jpg
```

---

## 6. 权限控制

| 操作 | 权限说明 |
|------|----------|
| 查看相册 | 宝宝家庭成员或协作者 |
| 上传照片 | 宝宝家庭成员或协作者 |
| 评论/点赞 | 宝宝家庭成员或协作者 |
| 编辑/删除 | 上传者或宝宝所有者 |

---

## 7. 后续优化方向

1. **人脸识别** - 自动按宝宝标记照片
2. **AI 分类** - 按场景/表情自动分类
3. **照片拼图** - 成长里程碑拼图分享
4. **成长视频** - 将照片串成成长视频
5. **数据导出** - 打包下载全部照片
