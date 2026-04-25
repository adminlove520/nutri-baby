# AI 模块数据持久化设计

## 当前状态

### ✅ 已实现
- **Chat 助手**：`/api/chat`
  - `ChatConversation` - 对话记录
  - `ChatMessage` - 消息记录
  - 完整 CRUD，持久化 ✅

### ❌ 未实现
- **AI 健康分析**：`/api/ai/analyze`
  - 只返回 AI 结果，不存储
  - 用户看不到历史分析

- **每日锦囊**：`/api/tips`
  - 只有 cron（9:00）才存库
  - 用户手动触发时直接返回，不存储

## 改进设计

### 1. AI 分析存储 (`AIAnalysis` 表)

```prisma
model AIAnalysis {
  id          BigInt   @id @default(autoincrement())
  userId      BigInt
  babyId      BigInt?  // 可选关联宝宝
  type        String   // 'health' | 'vaccine' | 'growth' | 'custom'
  query       String   // 用户问题
  response    String   // AI 回复（Markdown）
  sentiment   String?  // 情感分析
  createdAt   DateTime @default(now())
  
  @@index([userId, createdAt])
}
```

### 2. 每日锦囊 (`ExpertTip` 表已有)

- cron 定时生成 → 存 `ExpertTip`
- 同时创建站内通知

### 3. 站内通知 (`Notification` 表已有)

## API 改动

### `/api/ai/analyze` - 增加存储

```typescript
// 请求
POST /api/ai
{ babyId, query, type }

// 响应
{
  id: "123",  // 新增：分析记录ID
  insight: "...",
  sentiment: "...",
  recommendations: [...]
}

// 同时：
// 1. 存入 AIAnalysis 表
// 2. 创建 Notification 站内信
```

### `/api/tips` - 增加手动触发存储

```typescript
// 请求
GET /api/tips?babyId=xxx&forceAI=true

// 响应
{
  tips: [...],
  notificationId: "xxx"  // 新增：通知ID
}

// 同时：
// 1. 存入 ExpertTip 表
// 2. 创建 Notification 站内信
```

## 实现计划

### Phase 1: AI 分析存储
1. 添加 `AIAnalysis` model 到 prisma schema
2. 修改 `/api/ai` POST handler 存储结果
3. 创建通知

### Phase 2: 每日锦囊手动存储
1. 修改 `/api/tips` GET handler
2. 手动触发时也存入 ExpertTip
3. 同时创建通知

### Phase 3: 前端适配
1. 显示历史分析记录
2. 优化超时设置
