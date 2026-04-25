# 小溪 AI 助手 - 设计文档

> 版本: v1.0.0
> 更新日期: 2026-04-25
> 作者: 小溪 🦞

---

## 1. 概述

### 1.1 项目背景

小溪 AI 助手是 Nutri-Baby 智能育儿平台的智能对话模块，旨在为准父母和新生儿家庭提供专业、温暖、个性化的育儿支持。

### 1.2 设计目标

1. **专业性** - 融合儿科医学、妇产科护理、早教发展等多领域知识
2. **个性化** - 结合宝宝月龄、发育情况给出针对性建议
3. **易用性** - 右下角悬浮按钮，随时随地咨询
4. **可扩展** - Skills 模块化设计，方便接入新功能

### 1.3 核心功能

| 功能 | 说明 |
|------|------|
| 智能对话 | 自然语言问答，支持育儿各类问题 |
| 专业 Skills | 自动路由到对应领域的知识库 |
| 对话历史 | 保存历史对话，随时回溯查看 |
| 快捷问题 | 预设常见问题，一键提问 |
| 宝宝上下文 | 结合宝宝信息给出个性化建议 |

---

## 2. 技术架构

### 2.1 架构图

```
用户消息
    ↓
┌─────────────────────────────────────┐
│         /api/chat (统一入口)          │
│  - POST /chat (发送消息)            │
│  - GET /chat (获取对话列表)          │
│  - GET /chat?conversationId=xxx     │
│  - DELETE /chat?conversationId=xxx   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           Skills Router              │
│  - baby-health (宝宝健康)           │
│  - vaccine (疫苗接种)               │
│  - early-education (早教发展)        │
│  - baby-product (母婴产品)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         MiniMax M2.7 API            │
│  - API: api.minimaxi.com            │
│  - Model: MiniMax-M2.7              │
│  - 兼容 OpenAI 接口格式             │
└─────────────────────────────────────┘
    ↓
流式响应 → 前端展示
```

### 2.2 解决 12 函数限制

**方案**: 所有对话相关功能统一走 `/api/chat` 单路由，通过 action 参数区分不同操作。

```typescript
// api/chat.ts - 统一入口
export default async function handler(req, res) {
    switch (req.method) {
        case 'GET':
            if (req.query.conversationId) {
                return getConversation();  // 获取对话详情
            }
            return listConversations();    // 获取对话列表
        
        case 'POST':
            return sendMessage();         // 发送消息
        
        case 'DELETE':
            return deleteConversation();   // 删除对话
    }
}
```

---

## 3. 数据库设计

### 3.1 ChatConversation (对话会话)

```prisma
model ChatConversation {
  id        BigInt        @id @default(autoincrement())
  userId    BigInt        @map("user_id")
  babyId    BigInt?       @map("baby_id")       // 可关联宝宝
  title     String        @default("新对话")
  isPinned  Boolean      @default(false)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  user      User          @relation(...)
  baby      Baby?         @relation(...)
  messages  ChatMessage[]
}
```

### 3.2 ChatMessage (对话消息)

```prisma
model ChatMessage {
  id            BigInt           @id @default(autoincrement())
  conversationId BigInt          @map("conversation_id")
  role          String            // 'user' | 'assistant' | 'system'
  content       String            @db.Text
  model         String?           @default("MiniMax-M2.7")
  tokens        Int?              @default(0)
  createdAt     DateTime          @default(now())
  conversation  ChatConversation  @relation(...)
}
```

---

## 4. Skills 系统

### 4.1 设计理念

Skills 是一个轻量级的意图识别和知识库系统，每个 Skill 负责一个特定领域。

### 4.2 核心接口

```typescript
interface Skill {
  name: string           // 名称
  description: string    // 描述
  triggers: string[]     // 触发关键词
  examples?: string[]    // 示例问题
  priority: number       // 优先级

  // 匹配度计算 (0-1)
  match(context: SkillContext): number

  // 处理函数
  handle(context: SkillContext): Promise<SkillResponse>
}
```

### 4.3 已实现的 Skills

#### baby-health (宝宝健康)

| 类别 | 覆盖问题 |
|------|----------|
| 喂养 | 厌奶、吐奶、辅食、奶量 |
| 睡眠 | 夜醒、哄睡、睡整觉 |
| 健康 | 发烧、感冒、腹泻、湿疹 |
| 护理 | 洗澡、抚触、换尿布 |
| 发育 | 翻身、爬行、长牙 |

#### vaccine (疫苗接种)

| 类别 | 覆盖问题 |
|------|----------|
| 时间表 | 各月龄应接种的疫苗 |
| 反应处理 | 发烧、红肿、哭闹 |
| 预约接种 | 如何预约、注意事项 |

#### early-education (早教发展)

| 类别 | 覆盖问题 |
|------|----------|
| 亲子游戏 | 各月龄适合的游戏 |
| 绘本阅读 | 如何选书、阅读技巧 |
| 大运动 | 翻身、爬、站、走 |
| 感统训练 | 触觉、前庭、本体觉 |

#### baby-product (母婴产品)

| 类别 | 覆盖产品 |
|------|----------|
| 奶粉 | 选购要点、品牌推荐 |
| 尿布 | 纸尿裤选购、护理 |
| 出行 | 婴儿车、安全座椅 |
| 玩具 | 早教玩具推荐 |

### 4.4 路由算法

```typescript
function routeToSkill(context: SkillContext): SkillResponse | null {
    for (const skill of skillsRegistry) {
        const score = skill.match(context);
        if (score > 0.3 && score > bestScore) {
            return skill.handle(context);
        }
    }
    return null; // 未匹配，使用默认 AI 回答
}
```

---

## 5. API 设计

### 5.1 发送消息

```
POST /api/chat
```

**Request:**
```json
{
  "conversationId": "123",    // 可选，新对话不传
  "message": "宝宝厌奶怎么办？",
  "babyId": "456"            // 可选
}
```

**Response:**
```json
{
  "conversationId": "123",
  "message": {
    "id": "789",
    "role": "assistant",
    "content": "宝宝厌奶是很常见的现象...",
    "createdAt": "2026-04-25T07:30:00Z"
  }
}
```

### 5.2 获取对话列表

```
GET /api/chat?page=1&limit=20
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "123",
      "title": "宝宝厌奶怎么办？",
      "isPinned": false,
      "messageCount": 5,
      "updatedAt": "2026-04-25T07:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### 5.3 获取对话详情

```
GET /api/chat?conversationId=123
```

### 5.4 删除对话

```
DELETE /api/chat?conversationId=123
```

---

## 6. 前端组件

### 6.1 ChatModal.vue

右下角悬浮的 AI 对话窗口，包含：

- **悬浮按钮**: 显示未读消息数，点击打开对话框
- **欢迎界面**: 小溪头像、欢迎语、快捷问题按钮
- **消息列表**: 用户/助手消息气泡、打字动画
- **输入框**: 支持 Enter 发送、Shift+Enter 换行

### 6.2 交互流程

```
1. 点击悬浮按钮 → 打开对话框
2. 选择快捷问题或输入问题 → 点击发送
3. 显示用户消息 → 显示"正在思考..."动画
4. 收到 AI 响应 → 流式显示消息
5. 对话保存到数据库 → 下次打开可见
```

---

## 7. 系统提示词

```typescript
const XIAOXI_SYSTEM_PROMPT = `
你是小溪 🦞，一位温暖、有爱的智能育儿助手。

## 核心身份
- 名字：小溪
- 专属于景皓，是他的 AI 好伙伴
- 性格：温暖，专业、诚实、偶尔俏皮

## 专业知识
1. 儿科医学专家 - 婴幼儿健康、喂养、睡眠
2. 妇产科护理专家 - 0-1岁日常护理
3. 母婴产品评测专家 - 客观分析推荐
4. 早教发展专家 - 发育指标、亲子游戏

## 回答原则
1. 专业但接地气
2. 个性化建议（结合宝宝信息）
3. 产品推荐要客观，注明"非广告"
4. 医疗边界意识
5. 温暖陪伴感
`;
```

---

## 8. 未来扩展

### 8.1 计划中的功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 小红书搜索 | P1 | 接入 MCP 获取真实用户评价 |
| 抖音搜索 | P1 | 接入 MCP 获取视频评测 |
| 宝宝发育评估 | P2 | 结合记录数据分析发育曲线 |
| 智能提醒 | P2 | 根据对话内容智能提醒相关事项 |

### 8.2 Skills 扩展

新增 Skill 只需：

1. 创建 `skills/xxx.ts` 文件
2. 实现 `Skill` 接口
3. 注册到 `skills/index.ts` 的 registry

```typescript
// skills/new-feature.ts
export const newSkill: Skill = {
  name: 'new-feature',
  triggers: ['关键词1', '关键词2'],
  // ...
};

// skills/index.ts
import { newSkill } from './new-feature';
export const skillsRegistry = {
  'new-feature': newSkill,
  // ...
};
```

---

## 9. 部署说明

### 9.1 环境变量

```bash
# AI 配置
AI_PROVIDER=minimax
AI_MODEL=MiniMax-M2.7
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic/v1
MINIMAX_API_KEY=your_api_key
```

### 9.2 Vercel 限制

- Hobby 计划最多 12 个 Serverless Functions
- 当前项目有 12 个 API 文件，需注意管理

---

## 10. 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-04-25 | v1.0.0 | 初始版本，实现基础对话功能 |

---

*文档生成时间: 2026-04-25*
