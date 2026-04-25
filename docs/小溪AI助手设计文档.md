# 小溪 AI 助手 - 设计文档

> 版本: v1.1.0
> 更新日期: 2026-04-25
> 作者: 小溪 🦞

---

## 1. 概述

### 1.1 项目背景

小溪 AI 助手是 Nutri-Baby 智能育儿平台的智能对话模块，旨在为准父母和新生儿家庭提供专业、温暖、个性化的育儿支持。

### 1.2 设计目标

1. **专业性** - 融合儿科医学、妇产科护理、早教发展等多领域知识
2. **个性化** - 结合宝宝月龄、发育情况给出针对性建议
3. **易用性** - 独立页面 + 首页入口，随时访问
4. **可扩展** - Skills 模块化设计，方便接入新功能

### 1.3 核心功能

| 功能 | 说明 |
|------|------|
| 独立页面 | 完整对话体验 `/chat` |
| 智能对话 | 自然语言问答，支持育儿各类问题 |
| 专业 Skills | 自动路由到对应领域的知识库 |
| 对话历史 | 保存历史对话，随时回溯查看 |
| 快捷问题 | 分类快捷问题，一键提问 |
| 宝宝上下文 | API 自动获取，无需手动传递 |

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
│         自动获取宝宝上下文              │
│  (从数据库获取用户的主要宝宝信息)       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         MiniMax M2.7 API            │
│  - API: api.minimaxi.com            │
│  - Model: MiniMax-M2.7              │
│  - 兼容 OpenAI 接口格式              │
└─────────────────────────────────────┘
    ↓
流式响应 → 前端展示
```

### 2.2 宝宝上下文自动获取

**方案**: API 自动从数据库获取用户的主要宝宝信息，不需要前端传递 babyId。

```typescript
// 自动获取逻辑：
// 1. 优先使用 defaultBabyId 指定的宝宝
// 2. 否则使用第一个创建的宝宝
const babyContext = await getBabyContext(userId);
```

### 2.3 解决 12 函数限制

**方案**: 所有对话相关功能统一走 `/api/chat` 单路由。

---

## 3. 数据库设计

### 3.1 ChatConversation (对话会话)

```prisma
model ChatConversation {
  id        BigInt        @id @default(autoincrement())
  userId    BigInt        @map("user_id")
  title     String        @default("新对话")
  isPinned  Boolean       @default(false)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  user      User          @relation(...)
  messages  ChatMessage[]
}
```

### 3.2 ChatMessage (对话消息)

```prisma
model ChatMessage {
  id            BigInt           @id @default(autoincrement())
  conversationId BigInt          @map("conversation_id")
  role          String            // 'user' | 'assistant'
  content       String           @db.Text
  model         String?          @default("MiniMax-M2.7")
  tokens        Int?             @default(0)
  createdAt     DateTime         @default(now())
  conversation  ChatConversation  @relation(...)
}
```

---

## 4. Skills 系统

### 4.1 设计理念

Skills 是一个轻量级的意图识别和知识库系统，每个 Skill 负责一个特定领域。

### 4.2 已实现的 Skills

| Skill | 领域 | 覆盖问题 |
|-------|------|----------|
| baby-health | 宝宝健康 | 喂养、睡眠、健康、护理、发育 |
| vaccine | 疫苗接种 | 时间表、反应处理、预约 |
| early-education | 早教发展 | 游戏、绘本、大运动、感统 |
| baby-product | 母婴产品 | 奶粉、尿布、玩具、推车 |

### 4.3 路由算法

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
  "message": "宝宝厌奶怎么办？"
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

### 5.3 获取对话详情

```
GET /api/chat?conversationId=123
```

### 5.4 删除对话

```
DELETE /api/chat?conversationId=123
```

---

## 6. 前端页面

### 6.1 入口方式

1. **首页入口**: 点击首页「咨询小溪」卡片跳转到 `/chat`
2. **直接访问**: 用户可直接访问 https://baby.dfyx.xyz/chat

### 6.2 页面结构

```
/chat 页面
├── 侧边栏
│   ├── Logo + 新建对话按钮
│   ├── 宝宝信息卡片
│   └── 对话列表
├── 主聊天区
│   ├── 欢迎界面（首次打开）
│   │   ├── 小溪头像
│   │   ├── 欢迎语
│   │   └── 分类快捷问题
│   └── 消息列表
│       ├── 用户消息
│       └── AI 消息
└── 输入区域
```

### 6.3 快捷问题分类

| 分类 | 图标 | 问题示例 |
|------|------|----------|
| 喂养问题 | 🍼 | 宝宝厌奶怎么办？辅食什么时候添加？ |
| 睡眠问题 | 😴 | 宝宝夜醒怎么办？哄睡有什么好方法？ |
| 健康护理 | 🏥 | 宝宝发烧怎么护理？湿疹怎么护理？ |
| 疫苗接种 | 💉 | 疫苗接种时间表？如何预约？ |
| 早教游戏 | 🎮 | 0-6个月适合什么游戏？亲子阅读从多大开始？ |
| 产品推荐 | 🛒 | 纸尿裤怎么选？婴儿车推荐哪个？ |

---

## 7. 系统提示词

```typescript
const XIAOXI_SYSTEM_PROMPT = `
你是小溪 🦞，一位温暖、有爱的智能育儿助手。

## 核心身份
- 名字：小溪
- 专属于景皓，是他的 AI 好伙伴
- 性格：温暖、专业、诚实、偶尔俏皮

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

## 8. 环境变量

### 8.1 AI 配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| AI_PROVIDER | AI 提供商 | minimax |
| AI_MODEL | 模型名称 | MiniMax-M2.7 |
| ANTHROPIC_BASE_URL | Anthropic 兼容接口 | https://api.minimaxi.com/anthropic/v1 |
| MINIMAX_API_KEY | MiniMax API Key | xxxx |

### 8.2 AutoCLI 配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| AUTOCLI_TOKEN | AutoCLI API Token | acli_xxxx |

**用途**: 用于搜索小红书、抖音等平台的真实用户评价和产品评测。

---

## 9. 未来扩展

### 9.1 计划中的功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 小红书搜索 | P1 | 接入 AutoCLI 获取真实用户评价 |
| 抖音搜索 | P1 | 接入 AutoCLI 获取视频评测 |
| 宝宝发育评估 | P2 | 结合记录数据分析发育曲线 |
| 智能提醒 | P2 | 根据对话内容智能提醒相关事项 |

### 9.2 Skills 扩展

新增 Skill 只需：

1. 创建 `skills/xxx.ts` 文件
2. 实现 `Skill` 接口
3. 注册到 `skills/index.ts` 的 registry

---

## 10. 部署说明

### 10.1 Vercel 限制

- Hobby 计划最多 12 个 Serverless Functions
- 当前项目有 12 个 API 文件，需注意管理

### 10.2 数据库迁移

新模型需要执行数据库迁移：

```bash
npx prisma db push
```

---

## 11. 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-04-25 | v1.0.0 | 初始版本，实现基础对话功能 |
| 2026-04-25 | v1.1.0 | 独立页面、API自动获取宝宝上下文、AutoCLI Token |

---

*文档生成时间: 2026-04-25*
